import fs from "node:fs";

const path = "server/marketingStudio.ts";
const source = fs.readFileSync(path, "utf8");
const portal = "https://ea.fizuxc0der.uk/";
const hashtags = [
  "#GeminiBotEA #MT5 #DemoFirst #TradingMalaysia",
  "#GeminiBotEA #XAUUSD #RiskManagement #MT5",
  "#GeminiBotEA #AlgorithmicTrading #TradingMalaysia #DemoFirst",
  "#GeminiBotEA #MT5 #TradingSystem #RiskFirst",
];
const keySuffixes = ["process", "checklist", "snapshot-a", "trade-log-a", "risk", "setup", "snapshot-b", "activity", "protected-delivery", "balance", "long-short", "metrics", "costs", "evidence", "demo", "monthly", "questions", "not-shortcut", "get-started", "review"];
const assetMap = {
  2: ["/manus-storage/IMG_2829_afce1590.PNG", "Owner-supplied Gemini Bot EA risk metrics screenshot"],
  3: ["/manus-storage/IMG_2830_370bd291.PNG", "Owner-supplied Gemini Bot EA profit and loss screenshot"],
  4: ["/manus-storage/IMG_2828_34f3c4c6.PNG", "Owner-supplied Gemini Bot EA XAUUSD trade detail screenshot"],
  5: ["/manus-storage/IMG_2835_7c658f52.PNG", "Owner-supplied Gemini Bot EA risk report screenshot"],
  7: ["/manus-storage/IMG_2840_e120a4fe.PNG", "Owner-supplied Gemini Bot EA second account summary screenshot"],
  8: ["/manus-storage/IMG_2833_571a13e3.PNG", "Owner-supplied Gemini Bot EA XAUUSD activity summary screenshot"],
  9: ["/manus-storage/IMG_2837_78a02fa3.PNG", "Owner-supplied Gemini Bot EA trade detail screenshot"],
  10: ["/manus-storage/IMG_2834_8b1fe7a4.PNG", "Owner-supplied Gemini Bot EA balance and drawdown screenshot"],
  11: ["/manus-storage/IMG_2832_9da9f941.PNG", "Owner-supplied Gemini Bot EA long and short activity screenshot"],
  12: ["/manus-storage/IMG_2829_afce1590.PNG", "Owner-supplied Gemini Bot EA performance metrics screenshot"],
  13: ["/manus-storage/IMG_2831_3625126c.PNG", "Owner-supplied Gemini Bot EA profit and loss chart screenshot"],
  14: ["/manus-storage/IMG_2838_f14608ad.PNG", "Owner-supplied Gemini Bot EA trade history screenshot"],
  19: ["/manus-storage/IMG_2841_74d86699.PNG", "Owner-supplied Gemini Bot EA second account risk screenshot"],
};
const drafts = [
  ["Nak automate MT5 dengan lebih teratur?", "Nak explore Gemini Bot EA? This is your chance to study a structured MT5 workflow—rules, setup, demo test, then monitor. Bukan magic button, tapi serious tool for traders yang mahu lebih systematic. No guaranteed profit. Check portal: " + portal],
  ["Jangan terus attach—buat 4 checks dulu", "Before attach Gemini Bot EA, check symbol, MT5 permission, lot sizing and spread. Simple checks, big difference untuk elak setup mistake. Start smart, test on demo dulu, then decide. Tengok full workflow: " + portal],
  ["Opportunity ada, tapi kena faham process", "Kalau anda curious dengan Gemini Bot EA, jangan ikut screenshot semata-mata. Study the process, test on demo, dan tengok sama ada workflow ini sesuai dengan risk tolerance anda. Explore sekarang: " + portal],
  ["Screenshot nampak menarik, tapi context lagi penting", "One trade screenshot can catch attention—but it is not your forecast. Tengok entry, exit, size, timing, drawdown and market condition sebelum buat keputusan. Evidence untuk study, bukan promise. Review portal: " + portal],
  ["Profit dan loss memang datang satu package", "Dalam trading, winning period dan losing period boleh berlaku bersama. Gemini Bot EA helps execute configured MT5 rules, but volatility, slippage and broker conditions tetap wujud. Faham risk dulu: " + portal],
  ["Kalau nak cuba EA, mula dengan setup yang betul", "Interested nak try Gemini Bot EA? Review installation, account binding, settings, demo testing and monitoring. Bila process clear, lebih senang anda decide dengan kepala sendiri. Start your review here: " + portal],
  ["Same EA, different account—jangan compare membuta", "Results boleh berbeza ikut balance, settings, broker execution, spread dan market regime. Sebab itu Gemini Bot EA perlu diuji ikut keadaan akaun anda sendiri, bukan copy result orang. Explore dengan lebih bijak: " + portal],
  ["Curious? Turn it into a proper demo test", "Tak perlu rush. Read the guide, attach Gemini Bot EA on demo, monitor behavior and record what you see. Itu cara paling practical untuk tahu workflow ini fit atau tidak dengan cara trading anda: " + portal],
  ["Sebelum subscribe, tanya soalan yang betul", "What can I lose? How will I monitor? What if market conditions change? Soalan simple, tapi penting. Gemini Bot EA is for traders who mahu study automation—not chase certainty. Read before deciding: " + portal],
  ["Bot boleh execute, tapi judgement tetap milik anda", "Gemini Bot EA can follow configured rules on MT5, tetapi anda masih control the setup, monitoring, broker choice and risk. Automation bukan alasan untuk switch off your judgement. Learn more: " + portal],
  ["Jangan tengok result sahaja—tengok drawdown juga", "A better review looks at profit, loss, drawdown, losing streaks, costs and exposure together. Itu yang bantu anda nampak full picture, bukan hanya headline number. Historical evidence is not a forecast: " + portal],
  ["Demo first bukan lambat—itu preparation", "Before live funds, verify symbol, permission, lot size and expected behavior on demo. Gemini Bot EA deserves a measured test, bukan keputusan terburu-buru sebab nampak one good screenshot: " + portal],
  ["Bukti yang bagus buat kita tanya soalan lebih baik", "Owner-supplied performance evidence boleh bantu anda investigate timing, sizing and conditions. Tapi jangan anggap result itu akan repeat pada account anda. Study the details here: " + portal],
  ["Jangan lupa trading costs dalam kira-kira", "Spread, slippage, commission, swap and execution boleh affect your result. Kalau nak evaluate Gemini Bot EA, kira semua costs—not just the attractive gross number. Make an informed decision: " + portal],
  ["Automation yang serius perlukan operating plan", "Sebelum guna Gemini Bot EA, decide how you will configure, monitor, pause and review it. Software is one part; your discipline and risk limits are still important. Build your plan: " + portal],
  ["Market berubah—good period bukan guarantee", "A strong historical period does not remove future uncertainty. Pasaran boleh berubah, execution boleh berbeza, dan risk tetap ada. Evaluate Gemini Bot EA across your own settings and limits: " + portal],
  ["Customer journey pun kena clear", "Verified access, account binding, installation guide and demo testing—semua ini buat setup lebih kemas. Clear delivery does not remove market risk, but it reduces avoidable confusion. See the Gemini Bot EA flow: " + portal],
  ["Banyak trade tak semestinya better result", "Trade frequency alone is not the full story. Tengok size, drawdown, costs, exposure and market conditions sebelum judge Gemini Bot EA. Data should help you investigate, bukan ikut hype: " + portal],
  ["Ready nak explore Gemini Bot EA?", "Kalau anda serius nak study MT5 automation, start with the risk note, read the workflow and test on demo. Jangan kejar janji—buat review yang boleh anda explain dan monitor. Visit the portal: " + portal],
  ["Kalau tak boleh explain, jangan terus automate", "Choose only a workflow yang anda faham, boleh monitor and boleh accept risikonya. Gemini Bot EA is an opportunity to evaluate automation, not guaranteed income. Review the full details before you decide: " + portal],
];
if (drafts.length !== 20) throw new Error(`Expected 20 drafts, got ${drafts.length}`);
const revision = drafts.map(([title, caption], i) => {
  const day = String(i + 1).padStart(2, "0");
  const asset = assetMap[i + 1];
  return `  { contentKey: "threads-gemini-day-${day}-${keySuffixes[i]}", title: ${JSON.stringify(title)}, language: "en_ms", dayOffset: ${i + 1},${asset ? ` assetUrl: ${JSON.stringify(asset[0])}, assetAlt: ${JSON.stringify(asset[1])},` : ""} destinationUrl: ${JSON.stringify(portal)}, caption: ${JSON.stringify(caption + " " + hashtags[i % hashtags.length])} },`;
}).join("\n");
const evergreen = drafts.map(([title, caption], i) => `  { title: ${JSON.stringify(title)}, caption: ${JSON.stringify(caption + " " + hashtags[i % hashtags.length])} },`).join("\n");
const next = source
  .replace(/export const GEMINI_BOT_THREADS_REVISION: MarketingDraftSeed\[\] = \[[\s\S]*?\n\];\n\nfunction contentHash/, `export const GEMINI_BOT_THREADS_REVISION: MarketingDraftSeed[] = [\n${revision}\n];\n\nfunction contentHash`)
  .replace(/export const EVERGREEN_GEMINI_COPY_BANK = \[[\s\S]*?\n\] as const;/, `export const EVERGREEN_GEMINI_COPY_BANK = [\n${evergreen}\n] as const;`);
if (next === source) throw new Error("No source changes were applied");
fs.writeFileSync(path, next);
console.log("Rewrote 20 campaign drafts and 20 evergreen variants in Malaysian BM/English rojak style.");
