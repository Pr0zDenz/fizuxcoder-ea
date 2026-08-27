import { sendTelegramConnectionTest } from "../server/telegramSignals";

const result = await sendTelegramConnectionTest({
  actorUserId: 1,
  confirmation: "SEND TELEGRAM TEST",
});

console.log(JSON.stringify(result, null, 2));
