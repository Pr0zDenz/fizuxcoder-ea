import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const outputDir = "/home/ubuntu/fizuxcoder-ea-brochure/docs/release-records/mql5";
const uploadDir = "/home/ubuntu/upload";
mkdirSync(outputDir, { recursive: true });

function stripFunction(source, functionName) {
  const definition = source.match(new RegExp(`^[ \\t]*(?:void|bool|int|double|string|long|datetime|uint|uchar|color)[ \\t]+${functionName}\\s*\\([^;]*?\\)\\s*\\{`, "m"));
  if (!definition || definition.index === undefined) return source;
  const lineStart = definition.index;
  const openBrace = definition.index + definition[0].lastIndexOf("{");
  let depth = 0, inString = false, escaped = false, inLineComment = false, inBlockComment = false;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i], next = source[i + 1];
    if (inLineComment) { if (ch === "\\n") inLineComment = false; continue; }
    if (inBlockComment) { if (ch === "*" && next === "/") { inBlockComment = false; i += 1; } continue; }
    if (inString) { if (escaped) escaped = false; else if (ch === "\\\\") escaped = true; else if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === "/" && next === "/") { inLineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i += 1; continue; }
    if (ch === "{") depth += 1;
    if (ch === "}" && --depth === 0) return source.slice(0, lineStart) + source.slice(i + 1);
  }
  throw new Error(`Unbalanced body for ${functionName}`);
}

function stripFunctions(source, names) { return names.reduce((value, name) => stripFunction(value, name), source); }
function stripDeclarations(source, names) {
  for (const name of names) source = source.replace(new RegExp(`^[ \\t]*(?:void|bool|int|double|string|long|datetime|uint|uchar|color)[ \\t]+${name}\\s*\\([^;]*\\);[ \\t]*\\r?\\n`, "gm"), "");
  return source;
}
function stripCalls(source, names) {
  for (const name of names) source = source.replace(new RegExp(`\\b${name}\\s*\\([^;{}]*\\)\\s*;`, "g"), "");
  return source;
}

const geminiHooks = [
  "MakeMarketingEventId", "BuildTelegramEntryLayersJson", "DetectTelegramTriggeredEntryLayer",   "SendTelegramSetupSignal", "SendTelegramLifecycleUpdate", "ClearTelegramLifecycleState", "PersistTelegramLifecycleState", "RestoreTelegramLifecycleState", "TelegramStatePrefix", "TelegramStateKey", "IsValidGeminiPingResponse", "PingGeminiEventPortal", "QueueMarketingScreenshot", "UploadMarketingScreenshot",
];
const geminiCallHooks = [...geminiHooks, "ReportTelegramBasketClosure", "ReportTelegramBasketCancellation", "MonitorTelegramLifecycle", "ProcessMarketingScreenshotQueue"];

function buildGemini() {
  const input = path.join(uploadDir, "GeminiBotEAv11.97_NewLook_TelegramEnabled_LayeredEntries.mq5");
  let   source = readFileSync(input, "utf8");
  source = source.replace(/\/\/=== Direct Marketing Screenshot Upload[\s\S]*?(?=\/\/=== Risk & Layering ===)/, "");
  source = source.replace(/^\s*(?:bool|void) ReportTelegramBasketClosure[\s\S]*?(?=^\s*string TelegramStatePrefix)/m, "");
  source = source.replace(/^\s*void ProcessMarketingScreenshotQueue\s*\([\s\S]*?(?=^\/\/\+[-]+\+)/m, "");
  source = stripFunctions(source, geminiHooks);
  source = stripDeclarations(source, geminiHooks);
  source = stripCalls(source, geminiCallHooks);
  source = source.replace(/^\s*PingGeminiEventPortal\s*\(\s*\)\s*;[^\r\n]*(?:\r?\n|$)/gm, "");
  source = source.replace(/^\s*\/\/ Telegram lifecycle reporting state[\s\S]*?(?=^\s*double\s+locked_fibo_sl_neg100)/m, "");
  source = source.replace(/^\s*(?:string|int|double|bool|datetime)\s+telegram_[^\r\n]*(?:\r?\n|$)/gm, "");
  source = source.replace(/^\s*telegram_[^\r\n]*(?:\r?\n|$)/gm, "");
  source = source.replace(/^\s*(?:string|int|double|bool|datetime)\s+telegram_[^\r\n]*(?:\r?\n|$)/gm, "");
  source = source.replace(/^\s*(?:input\s+)?(?:bool|string|int)\s+(?:Ping_Portal_On_Timer|Ping_Interval_Sec|Enable_Telegram_Signal|Gemini_Event_Ingest_Key|GEMINI_EVENT_PORTAL_URL|GEMINI_EVENT_PING_URL|GEMINI_TELEGRAM_SIGNAL_URL|Screenshot_Width|Screenshot_Height|Screenshot_Min_Interval_Sec)[^\r\n]*(?:\r?\n|$)/gm, "");
  source = source.replace(/Please contact Admin/gi, "Please contact support");
  source = "// CUSTOMER-SAFE VIP BUILD: customer trading and licensing logic preserved; internal reporting hooks removed.\n" + source;
  const output = path.join(outputDir, "GeminiBotEAv11.97_VIP.mq5");
  writeFileSync(output, source); copyFileSync(output, path.join(uploadDir, "GeminiBotEAv11.97_VIP.mq5")); return output;
}

function buildThreeS() {
  const input = path.join(uploadDir, "3SUniversalEA_customer_license_Cloudflare.mq5");
  let source = readFileSync(input, "utf8");
  source = source.replace(/^\s*input\s+bool\s+EnableAutoScreenshots[^\r\n]*(?:\r?\n|$)/m, "");
  source = stripFunctions(source, ["TakeTradeScreenshots"]);
  source = stripDeclarations(source, ["TakeTradeScreenshots"]);
  source = stripCalls(source, ["TakeTradeScreenshots"]);
  source = source.replace(/^\s*if\s*\(\s*EnableAutoScreenshots\s*\)[^\r\n]*(?:\r?\n|$)/m, "");
  source = source.replace(/SCREENSHOT ENGINE/gi, "RUNTIME ENGINE");
  source = "// CUSTOMER-SAFE VIP BUILD: trading, macro, licensing, and runtime logic preserved.\n" + source;
  const output = path.join(outputDir, "3SUniversalEA_customer_license_VIP.mq5");
  writeFileSync(output, source); copyFileSync(output, path.join(uploadDir, "3SUniversalEA_customer_license_VIP.mq5")); return output;
}

console.log([buildGemini(), buildThreeS()].join("\n"));
