import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { callbackAmountToSen, verifyToyyibPayCallback } from "./toyyibpay";

describe("ToyyibPay callback safeguards", () => {
  it("accepts the documented signature only when every signed callback field is intact", () => {
    const secret = process.env.TOYYIBPAY_USER_SECRET_KEY!;
    const callback = { status: "1", order_id: "FZ-TEST123", refno: "TP-REF-1" };
    const hash = createHash("md5").update(`${secret}${callback.status}${callback.order_id}${callback.refno}ok`).digest("hex");
    expect(verifyToyyibPayCallback({ ...callback, hash })).toBe(true);
    expect(verifyToyyibPayCallback({ ...callback, hash, order_id: "FZ-TAMPERED" })).toBe(false);
  });

  it("converts ToyyibPay decimal callback amounts into the expected sen value", () => {
    expect(callbackAmountToSen("499.00")).toBe(49_900);
    expect(callbackAmountToSen("2999.00")).toBe(299_900);
    expect(callbackAmountToSen("49900")).toBe(49_900);
  });
});
