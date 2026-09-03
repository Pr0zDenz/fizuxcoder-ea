import fs from "node:fs";

const path = "server/marketingStudio.ts";
const source = fs.readFileSync(path, "utf8");

const portal = "https://ea.fizuxc0der.uk/";
const hashtagSets = [
  "#GeminiBotEA #MT5 #DemoFirst #TradingEducation",
  "#GeminiBotEA #MT5 #RiskManagement #AlgorithmicTrading",
  "#GeminiBotEA #XAUUSD #TradingEvidence #MT5",
  "#GeminiBotEA #MT5 #TradingSystems #RiskFirst",
];

const drafts = [
  ["A clearer way to explore MT5 automation", "Curious about Gemini Bot EA? Start with a defined MT5 workflow: understand the rules, test on demo, and monitor the account. Berminat mencuba? Mulakan dengan faham proses, uji pada akaun demo, dan pantau sendiri. No EA can guarantee profit. Visit the portal: " + portal],
  ["Four checks before you attach an EA", "Before attaching Gemini Bot EA, check symbol, permissions, sizing, and spread conditions. Sebelum pasang Gemini Bot EA, semak simbol, kebenaran MT5, saiz lot, dan spread. A careful setup is your first advantage—not a promise of returns. Explore the portal: " + portal],
  ["The opportunity is a better process", "The opportunity is to evaluate a repeatable process before risking live funds. Peluang sebenar ialah menilai proses yang jelas sebelum menggunakan dana sebenar. Review Gemini Bot EA, test on demo, and decide at your own pace: " + portal],
  ["One screenshot is not your forecast", "A trading screenshot can start a conversation, but it cannot predict your account. Satu screenshot dagangan boleh membuka perbincangan, tetapi bukan ramalan akaun anda. Review context, losses, drawdown, and execution before deciding: " + portal],
  ["Why risk review matters", "Profit and loss arrive together in trading. Keuntungan dan kerugian sentiasa datang bersama dalam dagangan. Gemini Bot EA is software for configured MT5 execution, not a shortcut around volatility, slippage, or broker conditions. Learn more: " + portal],
  ["See the workflow before the headline", "Want to know what Gemini Bot EA actually involves? Review installation, account binding, settings, demo testing, and monitoring. Mahu tahu aliran sebenar? Semak pemasangan, binding akaun, tetapan, ujian demo, dan pemantauan. Start here: " + portal],
  ["Different accounts, different outcomes", "The same EA can behave differently across accounts because settings, balance, broker execution, spread, and market regime differ. Akaun yang berbeza boleh menghasilkan pengalaman berbeza. Evaluate Gemini Bot EA for your own situation: " + portal],
  ["Turn curiosity into a measured test", "Curious traders do not need to rush. Pedagang yang ingin tahu tidak perlu terburu-buru. Read the guide, attach Gemini Bot EA to demo, record what you observe, and only then consider your next step: " + portal],
  ["What should you ask before subscribing?", "Ask: What can I lose? How will I monitor it? What happens when conditions change? Tanya: Berapa risiko yang mampu saya tanggung? Bagaimana saya akan memantau? Apa berlaku apabila pasaran berubah? Explore Gemini Bot EA: " + portal],
  ["A bot does not replace your judgement", "Gemini Bot EA can execute configured rules, but you remain responsible for settings, monitoring, and risk. Gemini Bot EA boleh melaksanakan peraturan yang ditetapkan, tetapi anda tetap bertanggungjawab terhadap tetapan dan risiko. Learn before you automate: " + portal],
  ["Read drawdown with the result", "A result means more when you also review drawdown, losing streaks, costs, and exposure. Keputusan lebih bermakna apabila drawdown, siri kerugian, kos, dan pendedahan turut dilihat. Historical material is context, not a forecast: " + portal],
  ["Demo first is a serious strategy", "Demo testing is not hesitation—it is preparation. Ujian demo bukan tanda takut—ia persediaan. Verify the MT5 environment, observe Gemini Bot EA, and decide whether the workflow fits your tolerance: " + portal],
  ["Evidence should create questions", "An owner-supplied result can invite useful questions about timing, sizing, and conditions. Bukti yang dibekalkan pemilik boleh membuka soalan tentang masa, saiz lot, dan keadaan pasaran. It does not promise your outcome. Review: " + portal],
  ["Costs belong in every EA decision", "Spread, slippage, commission, swaps, and execution can affect results. Spread, slippage, komisen, swap, dan pelaksanaan boleh mempengaruhi keputusan. Include those costs when evaluating Gemini Bot EA, not just the attractive number: " + portal],
  ["Build an operating plan", "Before using Gemini Bot EA, decide how you will configure, monitor, pause, and review it. Sebelum menggunakan Gemini Bot EA, tetapkan cara anda mengkonfigurasi, memantau, menghentikan, dan menilai sistem. A plan makes automation more responsible: " + portal],
  ["The market can change after a good period", "A strong period does not remove future uncertainty. Tempoh yang baik tidak menghapuskan ketidakpastian masa depan. Gemini Bot EA should be evaluated across settings, execution conditions, and your own risk limits: " + portal],
  ["Protected delivery, clearer setup", "A responsible customer journey includes verified access, account binding, installation guidance, and demo testing. Aliran pelanggan yang bertanggungjawab merangkumi akses disahkan, binding akaun, panduan pemasangan, dan ujian demo. Inspect the Gemini Bot EA workflow: " + portal],
  ["Do not confuse activity with certainty", "More trades do not automatically mean better results. Lebih banyak trade tidak semestinya bermaksud keputusan lebih baik. Review frequency, size, drawdown, and costs before forming an opinion about Gemini Bot EA: " + portal],
  ["Ready to investigate Gemini Bot EA?", "If you want to explore MT5 automation, begin with information: read the risk note, review the workflow, and test on demo. Jika mahu meneroka automasi MT5, mulakan dengan maklumat dan ujian demo. Past performance does not guarantee future results: " + portal],
  ["A decision you can explain is a better decision", "Choose only a workflow you can explain and monitor. Pilih hanya proses yang anda faham dan mampu pantau. Gemini Bot EA is an evaluation opportunity, not guaranteed income. Review the full portal before deciding: " + portal],
];

if (drafts.length !== 20) throw new Error(`Expected 20 drafts, got ${drafts.length}`);

const revision = drafts.map(([title, caption], i) => {
  const day = String(i + 1).padStart(2, "0");
  const keySuffixes = ["process", "checklist", "snapshot-a", "trade-log-a", "risk", "setup", "snapshot-b", "activity", "protected-delivery", "balance", "long-short", "metrics", "costs", "evidence", "demo", "monthly", "questions", "not-shortcut", "get-started", "review"];
  const keySuffix = keySuffixes[i];
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
  const asset = assetMap[i + 1];
  return `  { contentKey: "threads-gemini-day-${day}-${keySuffix}", title: ${JSON.stringify(title)}, language: "en_ms", dayOffset: ${i + 1},${asset ? ` assetUrl: ${JSON.stringify(asset[0])}, assetAlt: ${JSON.stringify(asset[1])},` : ""} destinationUrl: ${JSON.stringify(portal)}, caption: ${JSON.stringify(caption + " " + hashtagSets[i % hashtagSets.length])} },`;
}).join("\n");

const evergreen = drafts.map(([title, caption], i) => `  { title: ${JSON.stringify(title)}, caption: ${JSON.stringify(caption + " " + hashtagSets[i % hashtagSets.length])} },`).join("\n");

const next = source
  .replace(/export const GEMINI_BOT_THREADS_REVISION: MarketingDraftSeed\[\] = \[[\s\S]*?\n\];\n\nfunction contentHash/, `export const GEMINI_BOT_THREADS_REVISION: MarketingDraftSeed[] = [\n${revision}\n];\n\nfunction contentHash`)
  .replace(/export const EVERGREEN_GEMINI_COPY_BANK = \[[\s\S]*?\n\] as const;/, `export const EVERGREEN_GEMINI_COPY_BANK = [\n${evergreen}\n] as const;`)
  .replace(/language: "en" as const,\n    assetUrl:/g, `language: "en_ms" as const,\n    assetUrl:`)
  .replace(/const caption = `Gemini Bot EA \\$\{eventLabel\} captured at \\$\{occurredLabel\}\.[^\n]+? #GeminiBotEA #MT5 #TradingEvidence #RiskManagement`;/, 'const caption = `Gemini Bot EA ${eventLabel} captured at ${occurredLabel}. Owner-supplied event evidence only; not a promise or forecast. Semak konteks penuh, kerugian, drawdown, kos, dan keadaan pelaksanaan sebelum membuat keputusan. Lihat portal / Semak portal: ${GEMINI_EVENT_PORTAL_URL} #GeminiBotEA #MT5 #TradingEvidence #RiskManagement`;')
  .replace(/language: "en",\n    assetUrl: stored.url,/, `language: "en_ms",\n    assetUrl: stored.url,`);

if (next === source) throw new Error("No source changes were applied");
fs.writeFileSync(path, next);
console.log(`Rewrote ${drafts.length} campaign drafts and ${drafts.length} evergreen variants as EN+BM.`);
