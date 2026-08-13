import { createHash, timingSafeEqual } from "node:crypto";

const TOYYIBPAY_API_BASE = "https://toyyibpay.com/index.php/api";

export type ToyyibPayCategory = {
  CategoryName?: string;
  categoryName?: string;
  categoryDescription?: string;
  categoryStatus?: string;
};

export type ToyyibPayCallback = {
  refno?: string;
  status?: string;
  reason?: string;
  billcode?: string;
  order_id?: string;
  amount?: string;
  transaction_time?: string;
  hash?: string;
};

export type CreateBillInput = {
  categoryCode: string;
  billName: string;
  billDescription: string;
  amountSen: number;
  returnUrl: string;
  callbackUrl: string;
  externalReference: string;
  payerName: string;
  payerEmail: string;
  payerPhone?: string;
};

function requireToyyibPaySecret() {
  const secret = process.env.TOYYIBPAY_USER_SECRET_KEY;
  if (!secret) throw new Error("TOYYIBPAY_USER_SECRET_KEY is not configured");
  return secret;
}

function getFirstRecord(payload: unknown): Record<string, unknown> {
  const record = Array.isArray(payload) ? payload[0] : payload;
  if (typeof record !== "object" || record === null) {
    throw new Error(`ToyyibPay did not return a readable record: ${JSON.stringify(payload)}`);
  }
  return record as Record<string, unknown>;
}

function describeToyyibPayBillResponse(payload: unknown) {
  const record = typeof payload === "object" && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const fields = ["status", "code", "error", "message", "reason", "Description"]
    .map(key => record[key])
    .filter(value => typeof value === "string" && value.trim()) as string[];
  return fields.length ? fields.join(" · ") : "ToyyibPay returned an unrecognised bill response";
}

/** Read-only health check against ToyyibPay; it never creates or changes a bill. */
export async function getToyyibPayCategory(categoryCode: string): Promise<ToyyibPayCategory> {
  const body = new FormData();
  body.append("userSecretKey", requireToyyibPaySecret());
  body.append("categoryCode", categoryCode);
  const response = await fetch(`${TOYYIBPAY_API_BASE}/getCategoryDetails`, { method: "POST", body });
  if (!response.ok) throw new Error(`ToyyibPay category validation failed with HTTP ${response.status}`);
  return getFirstRecord(await response.json()) as ToyyibPayCategory;
}

export async function createToyyibPayBill(input: CreateBillInput): Promise<string> {
  const body = new FormData();
  const fields: Record<string, string> = {
    userSecretKey: requireToyyibPaySecret(),
    categoryCode: input.categoryCode,
    billName: input.billName.slice(0, 30).replace(/[^a-zA-Z0-9 _]/g, " "),
    billDescription: input.billDescription.slice(0, 100).replace(/[^a-zA-Z0-9 _]/g, " "),
    billPriceSetting: "0",
    billPayorInfo: "1",
    billAmount: String(input.amountSen),
    billReturnUrl: input.returnUrl,
    billCallbackUrl: input.callbackUrl,
    billExternalReferenceNo: input.externalReference,
    billTo: input.payerName.slice(0, 100),
    billEmail: input.payerEmail.slice(0, 320),
    billPhone: input.payerPhone ?? "",
    billSplitPayment: "0",
    billSplitPaymentArgs: "",
    billPaymentChannel: "0",
    billExpiryDays: "1",
  };
  for (const [key, value] of Object.entries(fields)) body.append(key, value);

  const response = await fetch(`${TOYYIBPAY_API_BASE}/createBill`, { method: "POST", body });
  const rawResponse = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawResponse);
  } catch {
    const responseKind = rawResponse.trimStart().startsWith("<") ? "an HTML page" : "a non-JSON response";
    throw new Error(`ToyyibPay bill creation returned ${responseKind} (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`ToyyibPay bill creation failed with HTTP ${response.status}: ${describeToyyibPayBillResponse(payload)}`);
  const result = getFirstRecord(payload);
  const billCode = result.BillCode;
  if (typeof billCode !== "string" || !billCode) throw new Error(`ToyyibPay did not return a BillCode: ${describeToyyibPayBillResponse(payload)}`);
  return billCode;
}

export function verifyToyyibPayCallback(callback: ToyyibPayCallback): boolean {
  if (!callback.status || !callback.order_id || !callback.refno || !callback.hash) return false;
  const expected = createHash("md5")
    .update(`${requireToyyibPaySecret()}${callback.status}${callback.order_id}${callback.refno}ok`)
    .digest("hex");
  const received = Buffer.from(callback.hash, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

/** ToyyibPay callback amounts are accepted as either sen integers or decimal MYR values. */
export function callbackAmountToSen(amount?: string): number | null {
  if (!amount?.trim()) return null;
  const normalized = amount.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}
