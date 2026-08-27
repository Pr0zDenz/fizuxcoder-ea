const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not configured");
}

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
  signal: AbortSignal.timeout(10_000),
});
const payload = await response.json().catch(() => null);

if (!response.ok || !payload?.ok || !Array.isArray(payload.result)) {
  throw new Error(payload?.description || `Telegram returned HTTP ${response.status}`);
}

const channels = new Map();
for (const update of payload.result) {
  const chat = update?.my_chat_member?.chat ?? update?.channel_post?.chat ?? update?.edited_channel_post?.chat;
  if (chat?.type === "channel" && typeof chat.id === "number") {
    channels.set(String(chat.id), { id: String(chat.id), title: String(chat.title ?? "Private channel") });
  }
}

console.log(JSON.stringify({ channels: [...channels.values()] }, null, 2));
