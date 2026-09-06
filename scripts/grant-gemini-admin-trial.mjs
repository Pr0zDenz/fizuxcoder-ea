import { grantGeminiAdminTrial } from "../server/adminGeminiTrial.ts";

const result = await grantGeminiAdminTrial({
  adminUserId: 1,
  accountNumber: "1100543436",
  durationDays: 7,
});

console.log(JSON.stringify({ ...result, startsAt: result.startsAt.toISOString(), expiresAt: result.expiresAt.toISOString() }, null, 2));
process.exit(0);
