import mysql from "mysql2/promise";
import { createHash } from "node:crypto";

const SUMMARY_DATE = "2026-08-28";
const SUMMARY_LABEL = "28-Aug-2026";
const WINDOW_START = "2026-08-28 16:00:00";
const WINDOW_END = "2026-08-29 16:00:00";
const SETTING_KEY = "owner_daily_telegram_summary";
const OWNER_USER_ID = 1;

function neutralSymbol(symbol) {
  return symbol.split(/[._-]/, 1)[0] || symbol;
}

function buildMessage(setups, lifecycleUpdates) {
  const outcomes = new Map();
  for (const update of lifecycleUpdates) {
    const values = outcomes.get(update.originalSignalEventId) ?? [];
    values.push(update.stage);
    outcomes.set(update.originalSignalEventId, values);
  }
  const tpCount = lifecycleUpdates.filter(({ stage }) => ["TP1", "TP2", "TP3"].includes(stage)).length;
  const slCount = lifecycleUpdates.filter(({ stage }) => stage === "SL").length;
  const basketClosedCount = lifecycleUpdates.filter(({ stage }) => stage === "BASKET_CLOSED").length;
  const basketCancelledCount = lifecycleUpdates.filter(({ stage }) => stage === "BASKET_CANCELLED").length;
  const details = setups.slice(0, 8).map(({ id, symbol, direction }) => `• ${neutralSymbol(symbol)} ${direction} — ${outcomes.get(id)?.join(", ") ?? "no lifecycle update recorded"}`);
  const omitted = setups.length - details.length;
  return [
    "📡 Gemini Bot EA — Daily Signal Summary",
    "⏱️ Delayed report: originally due at 00:00 GMT+8 on 28-Aug-2026",
    `📅 Trading day: ${SUMMARY_LABEL} (GMT+8)`,
    "",
    `📊 Delivered setup signals: ${setups.length}`,
    `✅ TP lifecycle updates: ${tpCount}`,
    `🛑 SL lifecycle updates: ${slCount}`,
    `💼 Confirmed basket-closure updates: ${basketClosedCount}`,
    `⚠️ Pending-order cancellation updates: ${basketCancelledCount}`,
    "",
    ...(details.length ? ["Signal record:", ...details, ...(omitted > 0 ? [`• +${omitted} additional delivered setup signal(s) recorded`] : [])] : ["No delivered setup signals or TP/SL lifecycle updates were recorded for this Malaysia trading day."]),
    "",
    "⚠️ Summary of channel notifications only, not a performance statement or forecast. Trading involves risk; verify conditions, costs, and your own risk limits before acting.",
  ].join("\n");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
let runId;
try {
  const [settingsRows] = await connection.execute(
    "SELECT channelId FROM telegramSignalSettings WHERE settingKey = ? LIMIT 1",
    ["primary"],
  );
  const channelId = settingsRows[0]?.channelId;
  if (!channelId || !process.env.TELEGRAM_BOT_TOKEN) throw new Error("Configured Telegram destination or bot token is unavailable");

  const [existingRows] = await connection.execute(
    "SELECT id, status, telegramMessageId FROM telegramDailySummaryRuns WHERE summaryDate = ? LIMIT 1",
    [SUMMARY_DATE],
  );
  if (existingRows[0]?.status === "delivered") {
    console.log(JSON.stringify({ ok: true, skipped: "already_delivered", runId: existingRows[0].id, telegramMessageId: existingRows[0].telegramMessageId }));
    process.exit(0);
  }
  if (existingRows[0]) throw new Error(`A non-delivered summary run already exists for ${SUMMARY_DATE}; refusing to duplicate it`);

  const [setups] = await connection.execute(
    "SELECT id, symbol, direction FROM telegramSignalEvents WHERE status = 'delivered' AND eventType = 'setup' AND deliveredAt >= ? AND deliveredAt < ? ORDER BY deliveredAt ASC",
    [WINDOW_START, WINDOW_END],
  );
  const [lifecycleUpdates] = await connection.execute(
    "SELECT originalSignalEventId, stage FROM telegramSignalLifecycleUpdates WHERE status = 'delivered' AND updatedAt >= ? AND updatedAt < ? ORDER BY updatedAt ASC",
    [WINDOW_START, WINDOW_END],
  );
  const message = buildMessage(setups, lifecycleUpdates);
  const hash = createHash("sha256").update(message).digest("hex");
  const [insertResult] = await connection.execute(
    "INSERT INTO telegramDailySummaryRuns (settingKey, summaryDate, status, setupCount, takeProfitCount, stopLossCount, messageHash) VALUES (?, ?, 'running', ?, ?, ?, ?)",
    [SETTING_KEY, SUMMARY_DATE, setups.length, lifecycleUpdates.filter(({ stage }) => ["TP1", "TP2", "TP3"].includes(stage)).length, lifecycleUpdates.filter(({ stage }) => stage === "SL").length, hash],
  );
  runId = insertResult.insertId;
  await connection.execute(
    "INSERT INTO telegramDailySummaryAudits (settingKey, runId, actorUserId, action, note) VALUES (?, ?, ?, 'run_started', ?)",
    [SETTING_KEY, runId, OWNER_USER_ID, `Owner-authorized delayed resend assembled for ${SUMMARY_LABEL}`],
  );

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, text: message, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok || !payload.result?.message_id) throw new Error(payload?.description || `Telegram returned HTTP ${response.status}`);
  const telegramMessageId = String(payload.result.message_id);
  await connection.execute(
    "UPDATE telegramDailySummaryRuns SET status='delivered', telegramMessageId=?, completedAt=CURRENT_TIMESTAMP, failureReason=NULL WHERE id=?",
    [telegramMessageId, runId],
  );
  await connection.execute(
    "INSERT INTO telegramDailySummaryAudits (settingKey, runId, actorUserId, action, note) VALUES (?, ?, ?, 'run_delivered', ?)",
    [SETTING_KEY, runId, OWNER_USER_ID, `Delayed daily summary Telegram message ${telegramMessageId} confirmed`],
  );
  console.log(JSON.stringify({ ok: true, delivered: true, summaryDate: SUMMARY_DATE, runId, telegramMessageId, setupCount: setups.length, lifecycleCount: lifecycleUpdates.length }));
} catch (error) {
  const reason = error instanceof Error ? error.message : "Delayed Telegram summary resend failed";
  if (runId) {
    await connection.execute("UPDATE telegramDailySummaryRuns SET status='failed', failureReason=?, completedAt=CURRENT_TIMESTAMP WHERE id=?", [reason.slice(0, 255), runId]);
    await connection.execute("INSERT INTO telegramDailySummaryAudits (settingKey, runId, actorUserId, action, note) VALUES (?, ?, ?, 'run_failed', ?)", [SETTING_KEY, runId, OWNER_USER_ID, reason.slice(0, 255)]);
  }
  console.error(JSON.stringify({ ok: false, error: reason, runId: runId ?? null }));
  process.exitCode = 1;
} finally {
  await connection.end();
}
