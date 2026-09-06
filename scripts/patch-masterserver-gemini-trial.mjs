import fs from "node:fs";

const sourcePath = process.argv[2] ?? "/home/ubuntu/upload/MasterServer_customer_fulfillment.py";
const outputPath = process.argv[3] ?? "/home/ubuntu/upload/MasterServer_customer_fulfillment_gemini_trial.py";
const marker = "# --- Endpoints from MasterServer.py (EA Config & Licensing) ---";
const source = fs.readFileSync(sourcePath, "utf8");
if (source.includes("@app.post(\"/admin/license/gemini-trial\")")) {
  fs.writeFileSync(outputPath, source);
  console.log(JSON.stringify({ status: "already_present", outputPath }, null, 2));
  process.exit(0);
}
const index = source.indexOf(marker);
if (index < 0) throw new Error(`Insertion marker not found: ${marker}`);
const route = String.raw`# --- Owner-only Gemini Bot admin trial ---
@app.post("/admin/license/gemini-trial")
def admin_gemini_trial() -> Any:
    if not admin_authorized():
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data, error = json_object()
    if error:
        return error

    email = str(data.get("email", "")).strip().lower()
    client_name = str(data.get("client_name") or "Gemini Bot Admin Trial").strip()[:160]
    product_id = str(data.get("product_id", "")).strip()
    account_number = str(data.get("account_number", "")).strip()
    try:
        duration_days = int(data.get("duration_days", 0))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "duration_days must be an integer"}), 400

    if not email or product_id != "gemini-bot-ea" or not valid_mt5_account(account_number) or duration_days != 7:
        return jsonify({"status": "error", "message": "Only a seven-day Gemini Bot admin trial is permitted"}), 400

    trial_label = "ADMIN TRIAL — NOT CUSTOMER PURCHASE"
    expiry = (utc_now().date() + timedelta(days=duration_days)).isoformat()
    with customer_file_lock:
        subscribers = load_subscribers()
        replaced_account = None
        for existing_account, record in list(subscribers.items()):
            if not isinstance(record, dict):
                continue
            same_email = str(record.get("email", "")).strip().lower() == email
            same_product = record.get("product_id") == product_id
            if existing_account == account_number and not (same_email and same_product):
                return jsonify({"status": "error", "message": "The MT5 account is already assigned to another licence"}), 409
            if same_email and same_product and existing_account != account_number:
                replaced_account = existing_account
                del subscribers[existing_account]
        subscribers[account_number] = {
            "client_name": client_name,
            "email": email,
            "product_id": product_id,
            "expiry": expiry,
            "active": True,
            "source": "admin_trial",
            "trial_label": trial_label,
            "bound_at": iso_now(),
        }
        save_subscribers(subscribers)

    logger.info("Issued Gemini admin trial for %s on MT5 account %s through %s", email, account_number, trial_label)
    return jsonify({"status": "success", "account_number": account_number, "replaced_account": replaced_account, "expiry": expiry, "trial_label": trial_label, "payment_required": False}), 200


`;
const patched = source.slice(0, index) + route + source.slice(index);
fs.writeFileSync(outputPath, patched);
console.log(JSON.stringify({ status: "patched", sourcePath, outputPath, insertedBytes: Buffer.byteLength(route) }, null, 2));
