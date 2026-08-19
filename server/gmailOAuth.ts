import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { gmailAuthorizations } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const GMAIL_STATE_COOKIE = "gmail_oauth_state";
const CALLBACK_PATH = "/api/gmail/oauth/callback";
const PRODUCTION_ORIGIN = "https://fizuxea-jxctlods.manus.space";

export const GMAIL_REDIRECT_URI = `${PRODUCTION_ORIGIN}${CALLBACK_PATH}`;

function config() {
  if (!ENV.gmailOauthClientId || !ENV.gmailOauthClientSecret || !ENV.gmailSenderEmail || !ENV.cookieSecret) {
    throw new Error("Gmail production sender configuration is incomplete");
  }
  return {
    clientId: ENV.gmailOauthClientId,
    clientSecret: ENV.gmailOauthClientSecret,
    senderEmail: ENV.gmailSenderEmail.trim().toLowerCase(),
  };
}

function tokenKey() {
  return createHash("sha256").update(`fizuxcoder:gmail:${ENV.cookieSecret}`).digest();
}

export function encryptGmailRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(part => part.toString("base64url")).join(".");
}

export function decryptGmailRefreshToken(payload: string) {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Stored Gmail authorization is malformed");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

function getQueryParam(req: Request, key: string) {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

async function getAdministrator(req: Request) {
  let user;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
  const { senderEmail } = config();
  if (!user || user.role !== "admin" || user.email?.trim().toLowerCase() !== senderEmail) return null;
  return user;
}

function safeStateMatch(expected: string | undefined, received: string | undefined) {
  if (!expected || !received) return false;
  const expectedValue = Buffer.from(expected);
  const receivedValue = Buffer.from(received);
  return expectedValue.length === receivedValue.length && timingSafeEqual(expectedValue, receivedValue);
}

export async function getStoredGmailRefreshToken() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const { senderEmail } = config();
  const authorization = (await db.select().from(gmailAuthorizations).where(eq(gmailAuthorizations.senderEmail, senderEmail)).limit(1))[0];
  return authorization ? decryptGmailRefreshToken(authorization.encryptedRefreshToken) : null;
}

export function registerGmailOAuthRoutes(app: Express) {
  app.get("/api/gmail/oauth/start", async (req, res) => {
    try {
      if (!await getAdministrator(req)) {
        res.status(403).json({ error: "Administrator authorization is required" });
        return;
      }
      const { clientId } = config();
      const state = randomBytes(32).toString("base64url");
      res.cookie(GMAIL_STATE_COOKIE, state, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: CALLBACK_PATH,
        maxAge: 10 * 60 * 1000,
      });
      const authorizeUrl = new URL(GOOGLE_AUTHORIZE_URL);
      authorizeUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: GMAIL_REDIRECT_URI,
        response_type: "code",
        scope: GMAIL_SEND_SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
      }).toString();
      res.redirect(302, authorizeUrl.toString());
    } catch (error) {
      console.error("[Gmail OAuth] Unable to start authorization", error);
      res.status(500).json({ error: "Unable to start Gmail authorization" });
    }
  });

  app.get(CALLBACK_PATH, async (req, res) => {
    const state = getQueryParam(req, "state");
    const code = getQueryParam(req, "code");
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GMAIL_STATE_COOKIE];
    res.clearCookie(GMAIL_STATE_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: CALLBACK_PATH });
    if (!safeStateMatch(expectedState, state) || !code) {
      res.status(403).json({ error: "Invalid Gmail authorization state" });
      return;
    }

    try {
      if (!await getAdministrator(req)) {
        res.status(403).json({ error: "Administrator authorization is required" });
        return;
      }
      const { clientId, clientSecret, senderEmail } = config();
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: GMAIL_REDIRECT_URI,
        }),
      });
      const tokenPayload = await tokenResponse.json() as { refresh_token?: string; scope?: string };
      if (!tokenResponse.ok || !tokenPayload.refresh_token) {
        res.status(400).json({ error: "Google did not return a refresh authorization. Revoke prior FizuxCoder Gmail access and retry." });
        return;
      }
      const db = await getDb();
      if (!db) throw new Error("Database is unavailable");
      await db.insert(gmailAuthorizations).values({
        senderEmail,
        encryptedRefreshToken: encryptGmailRefreshToken(tokenPayload.refresh_token),
        grantedScopes: tokenPayload.scope ?? GMAIL_SEND_SCOPE,
      }).onDuplicateKeyUpdate({
        set: {
          encryptedRefreshToken: encryptGmailRefreshToken(tokenPayload.refresh_token),
          grantedScopes: tokenPayload.scope ?? GMAIL_SEND_SCOPE,
          authorizedAt: new Date(),
        },
      });
      res.redirect(302, "/portal?gmail=connected");
    } catch (error) {
      console.error("[Gmail OAuth] Callback failed", error);
      res.status(500).json({ error: "Unable to store Gmail authorization" });
    }
  });
}
