import { applyGeminiBotThreadsAdditions } from "../server/marketingStudio";

const actorUserId = Number(process.env.MARKETING_ADMIN_USER_ID ?? 1);
if (!Number.isInteger(actorUserId) || actorUserId <= 0) throw new Error("MARKETING_ADMIN_USER_ID must be a positive integer");

const result = await applyGeminiBotThreadsAdditions(actorUserId);
console.log(JSON.stringify(result));
