import { runTelegramPerformanceReport } from "../server/telegramPerformanceReports.ts";

const result = await runTelegramPerformanceReport("daily", new Date("2026-09-02T00:01:00.000+08:00"), 1);
console.log(JSON.stringify(result, null, 2));
if (result.ok === false) process.exitCode = 1;
