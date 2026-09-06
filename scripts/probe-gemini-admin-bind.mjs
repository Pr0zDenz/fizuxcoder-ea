const baseUrl = (process.env.MASTER_SERVER_BASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.MASTER_SERVER_SYNC_KEY ?? "";
const response = await fetch(`${baseUrl}/license/bind`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Master-Sync-Key": key, "ngrok-skip-browser-warning": "1" },
  body: JSON.stringify({ email: "xtr0zen@gmail.com", product_id: "gemini-bot-ea", account_number: "1100543436" }),
});
console.log(JSON.stringify({ status: response.status, body: await response.text() }, null, 2));
process.exit(0);
