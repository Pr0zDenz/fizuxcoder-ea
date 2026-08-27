import { updateTelegramSignalSettings } from "../server/telegramSignals";

const result = await updateTelegramSignalSettings({
  actorUserId: 1,
  channelId: "-1004345161058",
  channelLabel: "FizuxCoder Expert Advisor",
  automaticDeliveryEnabled: true,
  killSwitchEngaged: false,
});

console.log(JSON.stringify({
  state: result.state,
  automaticDeliveryEnabled: result.automaticDeliveryEnabled,
  killSwitchEngaged: result.killSwitchEngaged,
  channelLabel: result.channelLabel,
}, null, 2));
