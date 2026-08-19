import { describe, expect, it } from "vitest";
import { sendGmailBuyerActivationEmail } from "./gmailSender";

const runLiveSend = process.env.RUN_LIVE_GMAIL_SEND === "1";

describe.skipIf(!runLiveSend)("live Gmail production sender", () => {
  it("sends one clearly labeled administrator-only verification without creating portal data", async () => {
    const sender = process.env.GMAIL_SENDER_EMAIL;
    expect(sender, "GMAIL_SENDER_EMAIL must be configured").toBe("xtr0zen@gmail.com");

    const result = await sendGmailBuyerActivationEmail({
      recipientEmail: sender!,
      productName: "[TEST — NO PAYMENT OR ENTITLEMENT] Gmail production sender verification",
      billingCycle: "lifetime",
    });

    expect(result.status).toBe("sent");
    if (result.status === "sent") expect(result.providerMessageId).toBeTruthy();
  }, 30_000);
});
