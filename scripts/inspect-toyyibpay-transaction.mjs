const body = new URLSearchParams({ billCode: "TEST-Gemini-Bot-EA", billpaymentStatus: "1" });
const response = await fetch("https://toyyibpay.com/index.php/api/getBillTransactions", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    Accept: "application/json",
  },
  body,
});

const raw = await response.text();
const normalized = raw.replace(/^\uFEFF/, "").trimStart();
let parsed = false;
let transactionCount = 0;
try {
  const payload = JSON.parse(normalized);
  parsed = Array.isArray(payload);
  transactionCount = Array.isArray(payload) ? payload.length : 0;
} catch {
  // Deliberately withhold the provider body: it can contain customer information.
}

console.log(JSON.stringify({
  httpStatus: response.status,
  contentType: response.headers.get("content-type") ?? "unknown",
  bytes: Buffer.byteLength(raw),
  startsWithHtml: normalized.startsWith("<"),
  validTransactionArray: parsed,
  transactionCount,
}, null, 2));
