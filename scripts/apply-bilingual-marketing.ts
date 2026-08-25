import { applyGeminiBotThreadsRevision } from "../server/marketingStudio";

const result = await applyGeminiBotThreadsRevision(1);
console.log(JSON.stringify(result));
