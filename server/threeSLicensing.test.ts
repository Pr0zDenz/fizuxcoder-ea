import { describe, expect, it, vi } from "vitest";
import { issueThreeSLicenceAfterVerifiedBinding } from "./threeSLicensing";

function createMockDb(existing: Record<string, unknown> | undefined, writes: Record<string, unknown>[], updates: Record<string, unknown>[]) {
  return {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => existing ? [existing] : [] }) }) }),
    insert: () => ({ values: async (value: Record<string, unknown>) => { writes.push(value); } }),
    update: () => ({ set: (value: Record<string, unknown>) => ({ where: async () => { updates.push(value); } }) }),
  } as never;
}

describe("3S one-time licence issuance", () => {
  const input = {
    userId: 17,
    entitlementId: 99,
    orderId: "order-3s-1",
    productId: "3s-universal-ea" as const,
    customerName: "3S Customer",
    recipientEmail: "buyer@example.test",
    accountNumber: "12345678",
  };

  it("issues one one-year Master Server credential and persists only a hash before emailing the plaintext code", async () => {
    const writes: Record<string, unknown>[] = [];
    const updates: Record<string, unknown>[] = [];
    const issueLicence = vi.fn().mockResolvedValue({ license_id: "3S-ORDER3S1", account_number: "12345678", expiry: "2027-08-21", activation_code: "plaintext-one-time-code" });
    const sendActivationEmail = vi.fn().mockResolvedValue({ status: "sent", providerMessageId: "gmail-3s-1" });

    await expect(issueThreeSLicenceAfterVerifiedBinding(input, { getDatabase: async () => createMockDb(undefined, writes, updates), issueLicence, sendActivationEmail })).resolves.toEqual({ accountNumber: "12345678", apiExpiry: "2027-08-21", status: "issued" });

    expect(issueLicence).toHaveBeenCalledWith({ licenseId: "3S-ORDER3S1", clientName: "3S Customer", accountNumber: "12345678" });
    expect(sendActivationEmail).toHaveBeenCalledWith(expect.objectContaining({ activationCode: "plaintext-one-time-code", recipientEmail: "buyer@example.test" }));
    expect(JSON.stringify(writes)).not.toContain("plaintext-one-time-code");
    expect(JSON.stringify(updates)).not.toContain("plaintext-one-time-code");
    expect(updates).toEqual(expect.arrayContaining([expect.objectContaining({ activationCodeHash: expect.stringMatching(/^[a-f0-9]{64}$/) }), expect.objectContaining({ status: "issued", providerMessageId: "gmail-3s-1" })]));
  });

  it("does not issue a second active licence for an entitlement already delivered to the same account", async () => {
    const issueLicence = vi.fn();
    const sendActivationEmail = vi.fn();
    const existing = { mt5AccountNumber: "12345678", status: "issued", apiExpiresAt: new Date("2027-08-21T00:00:00.000Z") };

    await expect(issueThreeSLicenceAfterVerifiedBinding(input, { getDatabase: async () => createMockDb(existing, [], []), issueLicence, sendActivationEmail })).resolves.toEqual({ accountNumber: "12345678", apiExpiry: "2027-08-21", status: "already_issued" });
    expect(issueLicence).not.toHaveBeenCalled();
    expect(sendActivationEmail).not.toHaveBeenCalled();
  });

  it("fails closed for a different account instead of creating an additional active 3S licence", async () => {
    const existing = { mt5AccountNumber: "12345678", status: "issued", apiExpiresAt: new Date("2027-08-21T00:00:00.000Z") };
    await expect(issueThreeSLicenceAfterVerifiedBinding({ ...input, accountNumber: "87654321" }, { getDatabase: async () => createMockDb(existing, [], []) })).rejects.toThrow("already attached to a different MT5 account");
  });
});
