const baseUrl = (process.env.MASTER_SERVER_BASE_URL ?? "").replace(/\/+$/, "");
const key = process.env.FULFILLMENT_ADMIN_KEY ?? "";
const response = await fetch(`${baseUrl}/admin/license/gemini-trial`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Fulfillment-Admin-Key": key, "ngrok-skip-browser-warning": "1" },
  body: JSON.stringify({ email: "xtr0zen@gmail.com", client_name: "Route Probe", product_id: "gemini-bot-ea", account_number: "1100543436", duration_days: 6 }),
});
console.log(JSON.stringify({ status: response.status, body: await response.text() }, null, 2));
process.exit(0);
