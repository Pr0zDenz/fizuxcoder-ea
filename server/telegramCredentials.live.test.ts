import { describe, expect, it } from "vitest";
import { validateTelegramBotCredential } from "./telegramSignals";

describe("Telegram bot credential", () => {
  it("is accepted by Telegram through getMe without sending a channel message", async () => {
    const bot = await validateTelegramBotCredential();
    expect(bot.id).toBeGreaterThan(0);
    expect(bot.username).toMatch(/^[A-Za-z0-9_]+bot$/i);
  }, 15_000);
});
