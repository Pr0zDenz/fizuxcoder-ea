import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { threadsAuthorizations } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const THREADS_AUTHORIZE_URL = "https://threads.com/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.com/oauth/access_token";
const THREADS_LONG_LIVED_TOKEN_URL = "https://graph.threads.com/access_token";
const THREADS_PROFILE_URL = "https://graph.threads.com/v1.0/me";
const THREADS_STATE_COOKIE = "threads_oauth_state";
const CALLBACK_PATH = "/api/threads/oauth/callback";
const PRODUCTION_ORIGIN = "https://fizuxea-jxctlods.manus.space";
const THREADS_SCOPES = "threads_basic,threads_content_publish";

export const THREADS_REDIRECT_URI = `${PRODUCTION_ORIGIN}${CALLBACK_PATH}`;
export const THREADS_DEAUTHORIZE_URL = `${PRODUCTION_ORIGIN}/api/threads/deauthorize`;
export const THREADS_DATA_DELETION_URL = `${PRODUCTION_ORIGIN}/api/threads/data-deletion`;

type ThreadsTokenResponse = { access_token?: string; user_id?: string; expires_in?: number; error_message?: string };
type ThreadsProfile = { id?: string; username?: string; name?: string };
type VerifiedThreadsProfile = { id: string; username?: string; name?: string };

function config() {
  if (!ENV.threadsAppId || !ENV.threadsAppSecret || !ENV.cookieSecret) throw new Error("Threads OAuth configuration is incomplete");
  return { appId: ENV.threadsAppId, appSecret: ENV.threadsAppSecret };
}

function tokenKey() {
  return createHash("sha256").update(`fizuxcoder:threads:${ENV.cookieSecret}`).digest();
}

export function encryptThreadsAccessToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString("base64url")).join(".");
}

export function decryptThreadsAccessToken(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Stored Threads authorization is malformed");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

function safeStateMatch(expected: string | undefined, received: string | undefined) {
  if (!expected || !received) return false;
  const expectedValue = Buffer.from(expected);
  const receivedValue = Buffer.from(received);
  return expectedValue.length === receivedValue.length && timingSafeEqual(expectedValue, receivedValue);
}

function queryValue(req: Request, name: string) {
  const value = req.query[name];
  return typeof value === "string" ? value : undefined;
}

async function getAdministrator(req: Request) {
  try {
    const user = await sdk.authenticateRequest(req);
    return user?.role === "admin" ? user : null;
  } catch {
    return null;
  }
}

async function responseJson<T>(response: Response | globalThis.Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function getProfile(accessToken: string): Promise<VerifiedThreadsProfile> {
  const url = new URL(THREADS_PROFILE_URL);
  url.searchParams.set("fields", "id,username,name");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const profile = await responseJson<ThreadsProfile>(response);
  if (!response.ok || !profile.id) throw new Error("Threads profile identity was not returned");
  return { id: profile.id, username: profile.username, name: profile.name };
}

function decodeSignedRequest(signedRequest: string): { user_id: string } {
  const [signatureEncoded, payloadEncoded] = signedRequest.split(".");
  if (!signatureEncoded || !payloadEncoded) throw new Error("Malformed signed request");
  const { appSecret } = config();
  const expectedSignature = createHmac("sha256", appSecret).update(payloadEncoded).digest();
  const receivedSignature = Buffer.from(signatureEncoded, "base64url");
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) throw new Error("Invalid signed request signature");
  const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as { user_id?: string };
  if (!payload.user_id) throw new Error("Signed request does not identify a Threads user");
  return { user_id: payload.user_id };
}

export async function getThreadsAuthorization(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const authorization = (await db.select().from(threadsAuthorizations).where(eq(threadsAuthorizations.ownerUserId, ownerUserId)).limit(1))[0];
  return authorization ? { ...authorization, accessToken: decryptThreadsAccessToken(authorization.encryptedAccessToken) } : null;
}

export async function getThreadsConnectionStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const authorization = (await db.select({
    threadsUserId: threadsAuthorizations.threadsUserId,
    username: threadsAuthorizations.username,
    displayName: threadsAuthorizations.displayName,
    grantedScopes: threadsAuthorizations.grantedScopes,
    expiresAt: threadsAuthorizations.expiresAt,
    authorizedAt: threadsAuthorizations.authorizedAt,
  }).from(threadsAuthorizations).where(eq(threadsAuthorizations.ownerUserId, ownerUserId)).limit(1))[0];
  return authorization ? { connected: true as const, ...authorization } : { connected: false as const };
}

export function registerThreadsOAuthRoutes(app: Express) {
  app.get("/api/threads/oauth/start", async (req, res) => {
    try {
      if (!await getAdministrator(req)) return void res.status(403).json({ error: "Administrator authorization is required" });
      const { appId } = config();
      const state = randomBytes(32).toString("base64url");
      res.cookie(THREADS_STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK_PATH, maxAge: 10 * 60 * 1000 });
      const authorizeUrl = new URL(THREADS_AUTHORIZE_URL);
      authorizeUrl.search = new URLSearchParams({ client_id: appId, redirect_uri: THREADS_REDIRECT_URI, scope: THREADS_SCOPES, response_type: "code", state }).toString();
      res.redirect(302, authorizeUrl.toString());
    } catch (error) {
      console.error("[Threads OAuth] Unable to start authorization", error);
      res.status(500).json({ error: "Unable to start Threads authorization" });
    }
  });

  app.get(CALLBACK_PATH, async (req, res) => {
    const state = queryValue(req, "state");
    const code = queryValue(req, "code");
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[THREADS_STATE_COOKIE];
    res.clearCookie(THREADS_STATE_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK_PATH });
    if (!safeStateMatch(expectedState, state) || !code) return void res.redirect(302, "/admin/marketing?threads=invalid_state");
    try {
      const administrator = await getAdministrator(req);
      if (!administrator) return void res.status(403).json({ error: "Administrator authorization is required" });
      const { appId, appSecret } = config();
      const tokenResponse = await fetch(THREADS_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: appId, client_secret: appSecret, code, grant_type: "authorization_code", redirect_uri: THREADS_REDIRECT_URI }),
      });
      const shortLived = await responseJson<ThreadsTokenResponse>(tokenResponse);
      if (!tokenResponse.ok || !shortLived.access_token) throw new Error("Threads did not return an access token");
      const longLivedUrl = new URL(THREADS_LONG_LIVED_TOKEN_URL);
      longLivedUrl.search = new URLSearchParams({ grant_type: "th_exchange_token", client_secret: appSecret, access_token: shortLived.access_token }).toString();
      const longLivedResponse = await fetch(longLivedUrl);
      const longLived = await responseJson<ThreadsTokenResponse>(longLivedResponse);
      if (!longLivedResponse.ok || !longLived.access_token) throw new Error("Threads did not return a long-lived access token");
      const profile = await getProfile(longLived.access_token);
      const expiresAt = longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : null;
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable");
      await db.insert(threadsAuthorizations).values({ ownerUserId: administrator.id, threadsUserId: profile.id, username: profile.username ?? null, displayName: profile.name ?? null, encryptedAccessToken: encryptThreadsAccessToken(longLived.access_token), grantedScopes: THREADS_SCOPES, expiresAt }).onDuplicateKeyUpdate({ set: { threadsUserId: profile.id, username: profile.username ?? null, displayName: profile.name ?? null, encryptedAccessToken: encryptThreadsAccessToken(longLived.access_token), grantedScopes: THREADS_SCOPES, expiresAt, authorizedAt: new Date() } });
      res.redirect(302, "/admin/marketing?threads=connected");
    } catch (error) {
      console.error("[Threads OAuth] Callback failed", error);
      res.redirect(302, "/admin/marketing?threads=connection_failed");
    }
  });

  app.post("/api/threads/deauthorize", async (req, res) => {
    try {
      const { user_id } = decodeSignedRequest(String(req.body?.signed_request ?? ""));
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable");
      await db.delete(threadsAuthorizations).where(eq(threadsAuthorizations.threadsUserId, user_id));
      res.status(200).json({ success: true });
    } catch {
      res.status(400).json({ error: "Invalid deauthorization request" });
    }
  });

  app.post("/api/threads/data-deletion", async (req, res) => {
    try {
      const { user_id } = decodeSignedRequest(String(req.body?.signed_request ?? ""));
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable");
      await db.delete(threadsAuthorizations).where(eq(threadsAuthorizations.threadsUserId, user_id));
      const confirmationCode = randomBytes(18).toString("base64url");
      res.status(200).json({ url: `${PRODUCTION_ORIGIN}/api/threads/data-deletion/status?confirmation_code=${confirmationCode}`, confirmation_code: confirmationCode });
    } catch {
      res.status(400).json({ error: "Invalid data deletion request" });
    }
  });

  app.get("/api/threads/data-deletion/status", (_req, res) => {
    res.status(200).json({ status: "processed" });
  });
}
