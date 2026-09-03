import { getThreadsAuthorizationForPublishing } from "./threadsOAuth";

const THREADS_GRAPH_BASE = "https://graph.threads.com/v1.0";
export const THREADS_CONTAINER_WAIT_MS = 30_000;

export class ThreadsPublishError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ThreadsPublishError";
  }
}

export const THREADS_MAX_TEXT_LENGTH = 500;

export function normalizeThreadsText(text: string): string {
  return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r");
}

export function validateThreadsText(text: string): string {
  const normalized = normalizeThreadsText(text).trim();
  if (!normalized || normalized.length > THREADS_MAX_TEXT_LENGTH) {
    throw new ThreadsPublishError("INVALID_TEXT", "The approved Threads text must contain 1–500 characters");
  }
  return normalized;
}

export function buildThreadsPublicationText(caption: string, riskNotice?: string | null): string {
  const normalizedCaption = caption.trim();
  const normalizedRiskNotice = riskNotice?.trim() ?? "";
  return validateThreadsText(normalizedRiskNotice ? `${normalizedCaption}\\n\\n${normalizedRiskNotice}` : normalizedCaption);
}

type ThreadsApiResponse = { id?: string; error?: { message?: string; type?: string; code?: number } };

function safeProviderError(payload: ThreadsApiResponse | null, fallback: string) {
  const providerMessage = payload?.error?.message?.replace(/[\r\n]+/g, " ").slice(0, 180);
  return providerMessage ? `${fallback}: ${providerMessage}` : fallback;
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return { payload: JSON.parse(raw) as ThreadsApiResponse, raw };
  } catch {
    return { payload: null, raw };
  }
}

function resolvedImageUrl(assetUrl?: string | null) {
  if (!assetUrl) return null;
  try {
    const url = new URL(assetUrl, "https://ea.fizuxc0der.uk");
    if (url.protocol !== "https:") throw new Error("Image URL must use HTTPS");
    return url.toString();
  } catch {
    throw new ThreadsPublishError("INVALID_ASSET_URL", "The approved image URL is not valid for Threads publication");
  }
}

export async function publishThreadsPost({ ownerUserId, text, assetUrl, waitMs = THREADS_CONTAINER_WAIT_MS }: { ownerUserId: number; text: string; assetUrl?: string | null; waitMs?: number }) {
  text = validateThreadsText(text);
  const authorization = await getThreadsAuthorizationForPublishing(ownerUserId);
  if (!authorization) throw new ThreadsPublishError("NOT_CONNECTED", "Connect the owner Threads account before publishing");
  if (authorization.expiresAt && authorization.expiresAt.getTime() <= Date.now()) throw new ThreadsPublishError("TOKEN_EXPIRED", "The Threads authorization has expired; reconnect the owner account");

  const imageUrl = resolvedImageUrl(assetUrl);
  const containerBody = new URLSearchParams({ media_type: imageUrl ? "IMAGE" : "TEXT", text, access_token: authorization.accessToken });
  if (imageUrl) containerBody.set("image_url", imageUrl);
  const containerResponse = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(authorization.threadsUserId)}/threads`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: containerBody });
  const container = await parseResponse(containerResponse);
  if (!containerResponse.ok || !container.payload?.id) throw new ThreadsPublishError(`CONTAINER_${containerResponse.status || "ERROR"}`, safeProviderError(container.payload, "Threads rejected the media container"));

  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
  const publishBody = new URLSearchParams({ creation_id: container.payload.id, access_token: authorization.accessToken });
  const publishResponse = await fetch(`${THREADS_GRAPH_BASE}/${encodeURIComponent(authorization.threadsUserId)}/threads_publish`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: publishBody });
  const published = await parseResponse(publishResponse);
  if (!publishResponse.ok || !published.payload?.id) throw new ThreadsPublishError(`PUBLISH_${publishResponse.status || "ERROR"}`, safeProviderError(published.payload, "Threads rejected the approved post"));
  return { externalPostId: published.payload.id, hasImage: Boolean(imageUrl) };
}
