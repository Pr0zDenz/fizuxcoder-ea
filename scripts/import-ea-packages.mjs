import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { productFiles } from "../drizzle/schema.ts";
import { storagePut } from "../server/storage.ts";
import { packageStorageKey, safeFileName } from "../server/paymentPortal.ts";

const UPLOAD_DIR = "/home/ubuntu/upload";

const packages = {
  "gemini-bot-ea": [
    ["Gemini Bot EA v11.97", "GeminiBotEAv11.97.ex5"],
    ["FizuxCoder News Calendar v5.00 Tradays", "FizuxCoder_News_Calendar_v5.00_Tradays.ex5"],
    ["FMCBR Fractal", "FMCBR-Fractal.ex5"],
  ],
  "3s-universal-ea": [
    ["3S Universal EA", "3SUniversalEA.ex5"],
    ["DT3 ZigZag LauerX", "DT3-ZigZag-LauerX.ex5"],
    ["3S Basket Dashboard", "3SBasketDashboard.ex5"],
    ["3S Matrix Dashboard", "3SMatrixDashboard.ex5"],
    ["3S Tradays News Calendar", "3STradaysNewsCalendar.ex5"],
    ["Trade History", "TradeHistory.ex5"],
    ["FMCBR Fractal", "FMCBR-Fractal.ex5"],
  ],
};

const available = new Set(await readdir(UPLOAD_DIR));
const db = await getDb();
if (!db) throw new Error("Database is unavailable");

for (const [productId, files] of Object.entries(packages)) {
  for (const [displayName, originalName] of files) {
    if (!available.has(originalName)) throw new Error(`Missing uploaded package: ${originalName}`);
    const fileName = safeFileName(originalName);
    const existing = await db.select().from(productFiles).where(and(eq(productFiles.productId, productId), eq(productFiles.fileName, fileName))).limit(1);
    if (existing.length) {
      console.log(`Skipping existing package record: ${fileName}`);
      continue;
    }
    const bytes = await readFile(path.join(UPLOAD_DIR, originalName));
    const stored = await storagePut(packageStorageKey(productId, fileName), bytes, "application/octet-stream");
    await db.insert(productFiles).values({ productId, displayName, fileName, storageKey: stored.key, contentType: "application/octet-stream" });
    console.log(`Stored ${fileName} for ${productId}`);
  }
}
