# MasterServer patch: Gemini Bot admin trial

This patch adds a payment-free, administrator-only endpoint for the approved Gemini Bot EA trial. It must be applied to the running VPS MasterServer source and restarted before the portal grant can succeed.

## 1. Add this route after `/license/bind`

```python
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

    if (
        not email
        or product_id != "gemini-bot-ea"
        or not valid_mt5_account(account_number)
        or duration_days != 7
    ):
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
    return jsonify({
        "status": "success",
        "account_number": account_number,
        "replaced_account": replaced_account,
        "expiry": expiry,
        "trial_label": trial_label,
        "payment_required": False,
    }), 200
```

## 2. Restart and verify on the VPS

Use the existing restart procedure after inserting the route. Then run these read-only probes from PowerShell. Do not print or paste the secret values.

```powershell
$base = "https://signal.fizuxc0der.uk"
$body = @{
  email = "xtr0zen@gmail.com"
  client_name = "Gemini Bot Admin Trial"
  product_id = "gemini-bot-ea"
  account_number = "1100543436"
  duration_days = 7
} | ConvertTo-Json

# Replace the placeholder by loading the existing machine-scope secret in your private session.
$headers = @{
  "Content-Type" = "application/json"
  "X-Fulfillment-Admin-Key" = $env:FULFILLMENT_ADMIN_KEY
  "ngrok-skip-browser-warning" = "1"
}

Invoke-RestMethod -Method Post -Uri "$base/admin/license/gemini-trial" -Headers $headers -Body $body
Invoke-RestMethod -Method Get -Uri "$base/config?symbol=XAUUSD&account=1100543436"
```

Expected result from the first request is HTTP 200 with `status=success`, `account_number=1100543436`, `payment_required=false`, and an expiry date seven days from the VPS UTC date. The config request should return the account’s active Gemini configuration. A missing route returns 404; an incorrect key returns 401. Never expose the key in screenshots, logs, or chat.

After the VPS endpoint returns HTTP 200, run the portal’s guarded admin-trial grant once. It will create the clearly labeled portal trial record, bind the same MT5 account, and expire the portal entitlement after seven days. The portal will not call ToyyibPay and will not create a customer payment receipt.
