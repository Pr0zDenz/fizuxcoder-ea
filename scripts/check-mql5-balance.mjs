import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../integrations/mql5/GeminiBotEAv11.97_authenticated_MLN_direct_upload.mq5", import.meta.url), "utf8");
const pairs = { "{": "}", "(": ")", "[": "]" };
const closing = new Set(Object.values(pairs));
const stack = [];
let line = 1;
let inString = false;
let escaped = false;
let inLineComment = false;
let inBlockComment = false;
for (let i = 0; i < source.length; i++) {
  const c = source[i];
  const n = source[i + 1];
  if (c === "\n") { line++; inLineComment = false; }
  if (inLineComment) continue;
  if (inBlockComment) { if (c === "*" && n === "/") { inBlockComment = false; i++; } continue; }
  if (!inString && c === "/" && n === "/") { inLineComment = true; i++; continue; }
  if (!inString && c === "/" && n === "*") { inBlockComment = true; i++; continue; }
  if (c === "\\" && inString && !escaped) { escaped = true; continue; }
  if (c === '"' && !escaped) { inString = !inString; continue; }
  escaped = false;
  if (inString) continue;
  if (pairs[c]) stack.push({ c, line });
  if (closing.has(c)) {
    const open = stack.pop();
    if (!open || pairs[open.c] !== c) throw new Error(`Unbalanced ${c} near line ${line}`);
  }
}
if (inString || inBlockComment || stack.length) throw new Error(`Unclosed syntax at line ${line}`);
for (const required of ["ChartScreenShot", "WebRequest(\"POST\"", "X-Gemini-Event-Key", "QueueMarketingScreenshot(\"setup\")", "QueueMarketingScreenshot(\"take_profit\")"]) {
  if (!source.includes(required)) throw new Error(`Missing required integration token: ${required}`);
}
console.log(`MQL5 structural review passed: ${source.split("\n").length} lines`);
