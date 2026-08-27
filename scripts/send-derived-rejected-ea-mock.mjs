import { sendTelegramMockFromRejectedEvent } from "../server/telegramSignals.ts";

const result = await sendTelegramMockFromRejectedEvent({
  actorUserId: 1,
  confirmation: "SEND REJECTED EA MOCK",
  referenceEventId: "gemini-230069105-XAUUSD-signal-1787839260",
});

console.log(JSON.stringify(result));
