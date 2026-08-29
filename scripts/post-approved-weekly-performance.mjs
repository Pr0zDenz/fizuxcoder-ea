import { runTelegramPerformanceReport } from "../server/telegramPerformanceReports.ts";

const result = await runTelegramPerformanceReport("weekly", new Date("2026-08-31T01:00:00.000Z"), 1);
console.log(JSON.stringify(result, null, 2));
if (result.ok === false) process.exitCode = 1;
