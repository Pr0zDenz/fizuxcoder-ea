import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { productFiles } from "../drizzle/schema.ts";
import { storagePut } from "../server/storage.ts";
import { packageStorageKey, safeFileName } from "../server/paymentPortal.ts";

const UPLOAD_DIR = "/home/ubuntu/upload";
const vipPackages = [
  { productId: "gemini-bot-ea", displayName: "Gemini Bot EA v11.97_VIP", fileName: "GeminiBotEAv11.97_VIP_package.zip" },
  { productId: "3s-universal-ea", displayName: "3S Universal EA_VIP", fileName: "3SUniversalEA_customer_license_VIP_package.zip" },
];

const db = await getDb();
if (!db) throw new Error("Database is unavailable");
for (const item of vipPackages) {
  const fileName = safeFileName(item.fileName);
  const existing = await db.select({ id: productFiles.id }).from(productFiles).where(and(eq(productFiles.productId, item.productId), eq(productFiles.fileName, fileName))).limit(1);
  if (existing.length) { console.log(`Already registered: ${item.displayName}`); continue; }
  const bytes = await readFile(path.join(UPLOAD_DIR, item.fileName));
  const stored = await storagePut(packageStorageKey(item.productId, fileName), bytes, "application/zip");
  await db.insert(productFiles).values({ productId: item.productId, displayName: item.displayName, fileName, storageKey: stored.key, contentType: "application/zip" });
  console.log(`Registered: ${item.displayName}`);
}
