import { describe, expect, it } from "vitest";
import { buildBuyerActivationEmail, deliverBuyerActivationEmail, toGmailRawMessage } from "./gmailSender";

describe("buyer activation email", () => {
  it("contains the portal activation steps and no sensitive account request", () => {
    const message = buildBuyerActivationEmail({
      recipientEmail: "buyer@example.com",
      productName: "Gemini Bot EA v11.97",
      billingCycle: "monthly",
    });

    expect(message.subject).toContain("Gemini Bot EA v11.97");
    expect(message.text).toContain("https://fizuxea-jxctlods.manus.space/portal#installation-guide");
    expect(message.text).toContain("Bind the numeric MT5 account");
    expect(message.text).toContain("Do not reply with passwords");
    expect(message.text).toContain("FizuxCoder News Calendar v5.00 Tradays");
    expect(message.text).toContain("FMCBR Fractal");
  });

  it("provides the distinct 3S package and update instructions", () => {
    const message = buildBuyerActivationEmail({
      recipientEmail: "buyer@example.com",
      productName: "3 Serangkai UNIVERSAL EA v13.85",
      billingCycle: "lifetime",
    });

    expect(message.text).toContain("3SUniversalEA");
    expect(message.text).toContain("3S Basket Dashboard");
    expect(message.text).toContain("remove or close the previous chart instance");
  });

  it("produces a URL-safe Gmail raw message with declared sender and recipient", () => {
    const raw = toGmailRawMessage({
      from: "xtr0zen@gmail.com",
      to: "buyer@example.com",
      subject: "Activation",
      text: "Portal access is active.",
    });
    const decoded = Buffer.from(raw, "base64url").toString("utf8");

    expect(raw).not.toMatch(/[+/=]/);
    expect(decoded).toContain("From: xtr0zen@gmail.com");
    expect(decoded).toContain("To: buyer@example.com");
  });

  it("does not resend an already-sent order", async () => {
    const sendActivationEmail = async () => ({ status: "sent" as const, providerMessageId: "should-not-send" });
    const getDatabase = async () => ({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ status: "sent" }] }) }) }),
    }) as never;

    await expect(deliverBuyerActivationEmail({
      userId: 1, orderId: "order-1", productId: "gemini-bot-ea", productName: "Gemini Bot EA v11.97", billingCycle: "monthly", recipientEmail: "buyer@example.com", isTest: "no",
    }, { getDatabase, sendActivationEmail })).resolves.toEqual({ status: "already_sent" });
  });

  it("records a failed provider send without revoking the verified entitlement", async () => {
    const writes: Record<string, unknown>[] = [];
    const getDatabase = async () => ({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: (value: Record<string, unknown>) => {
        writes.push(value);
        return { onDuplicateKeyUpdate: async () => undefined };
      } }),
    }) as never;
    const sendActivationEmail = async () => { throw new Error("GMAIL_SEND_FAILED"); };

    await expect(deliverBuyerActivationEmail({
      userId: 1, orderId: "order-2", productId: "gemini-bot-ea", productName: "Gemini Bot EA v11.97", billingCycle: "monthly", recipientEmail: "buyer@example.com", isTest: "no",
    }, { getDatabase, sendActivationEmail })).resolves.toEqual({ status: "failed" });
    expect(writes[0]).toMatchObject({ status: "failed", failureCode: "GMAIL_SEND_FAILED" });
  });

  it("leaves no delivery audit when administrator Gmail authorization is absent", async () => {
    const getDatabase = async () => ({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => { throw new Error("An unauthorized sender must not write an audit row"); },
    }) as never;
    const sendActivationEmail = async () => ({ status: "not_authorized" as const });

    await expect(deliverBuyerActivationEmail({
      userId: 1, orderId: "order-3", productId: "gemini-bot-ea", productName: "Gemini Bot EA v11.97", billingCycle: "monthly", recipientEmail: "buyer@example.com", isTest: "no",
    }, { getDatabase, sendActivationEmail })).resolves.toEqual({ status: "not_authorized" });
  });
});
