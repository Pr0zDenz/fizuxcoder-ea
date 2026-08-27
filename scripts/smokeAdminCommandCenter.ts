import { getAdminCommandCenterSnapshot } from "../server/adminCommandCenter";

const snapshot = await getAdminCommandCenterSnapshot();
console.log(JSON.stringify({
  generatedAt: snapshot.generatedAt,
  masterServer: snapshot.masterServer,
  telegram: snapshot.telegram,
  activeEntitlements: snapshot.entitlements.active,
}, null, 2));
