import { afterEach, describe, expect, it, vi } from "vitest";
import { createToyyibPayBill, getSuccessfulBillTransactions } from "./toyyibpay";

describe("ToyyibPay permanent-bill transaction lookup", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns only the provider list response for a successful-bill lookup", async () => {
    const expected = [{ billpaymentStatus: "1", billpaymentInvoiceNo: "TP-TEST-1", billEmail: "xtr0zen@gmail.com", billpaymentAmount: "450.00" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(expected), { status: 200 })));
    await expect(getSuccessfulBillTransactions("t1rvxbft")).resolves.toEqual(expected);
  });

  it("rejects an HTML response rather than treating it as a successful payment list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!DOCTYPE html><html></html>", { status: 200 })));
    await expect(getSuccessfulBillTransactions("t1rvxbft")).rejects.toThrow("HTML page");
  });

  it("submits the callback-enabled RM1 bill fields as URL-encoded data and retains a provider validation message", async () => {
    const priorSecret = process.env.TOYYIBPAY_USER_SECRET_KEY;
    process.env.TOYYIBPAY_USER_SECRET_KEY = "test-secret";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ msg: "billPhone is required" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createToyyibPayBill({
      categoryCode: "x42sivvj",
      billName: "Gemini RM1 test",
      billDescription: "Isolated test",
      amountSen: 100,
      returnUrl: "https://example.test/portal",
      callbackUrl: "https://example.test/payment_success",
      externalReference: "FZTEST-UNIT-1",
      payerName: "Owner test",
      payerEmail: "owner@example.test",
      payerPhone: "0123456789",
    })).rejects.toThrow("billPhone is required");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" });
    expect((init.body as URLSearchParams).get("billPriceSetting")).toBe("1");
    expect((init.body as URLSearchParams).get("billPhone")).toBe("0123456789");
    if (priorSecret === undefined) delete process.env.TOYYIBPAY_USER_SECRET_KEY;
    else process.env.TOYYIBPAY_USER_SECRET_KEY = priorSecret;
  });
});
