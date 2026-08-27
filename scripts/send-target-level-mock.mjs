import { sendTelegramMockEaSetup } from "../server/telegramSignals.ts";

const result = await sendTelegramMockEaSetup({
  actorUserId: 1,
  confirmation: "SEND EA MOCK TEST",
});

console.log(JSON.stringify(result));
