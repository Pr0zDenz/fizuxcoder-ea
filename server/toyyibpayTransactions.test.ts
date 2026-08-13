import { afterEach, describe, expect, it, vi } from "vitest";
import { getSuccessfulBillTransactions } from "./toyyibpay";

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
});
