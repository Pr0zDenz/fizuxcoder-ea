import { createHash } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { marketingContentItems } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";

const OLD_URL = "https://fizuxea-jxctlods.manus.space/portal";
const NEW_URL = "https://ea.fizuxc0der.uk/";
const BATCH_SIZE = 40;

const db = await getDb();
if (!db) throw new Error("Database is unavailable");

const rows = await db.select().from(marketingContentItems).where(and(
  eq(marketingContentItems.destinationUrl, OLD_URL),
  ne(marketingContentItems.status, "posted"),
));

let updated = 0;
for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
  const batch = rows.slice(offset, offset + BATCH_SIZE);
  await Promise.all(batch.map(async row => {
    const caption = row.caption.replaceAll(OLD_URL, NEW_URL);
    const contentHash = createHash("sha256").update(JSON.stringify({
      title: row.title,
      caption,
      language: row.language,
      assetUrl: row.assetUrl ?? null,
      assetAlt: row.assetAlt ?? null,
      destinationUrl: NEW_URL,
      riskNotice: row.riskNotice,
    })).digest("hex");
    await db.update(marketingContentItems).set({ caption, destinationUrl: NEW_URL, contentHash }).where(eq(marketingContentItems.id, row.id));
  }));
  updated += batch.length;
  console.log(`Migrated ${updated}/${rows.length} unposted records`);
}

console.log(JSON.stringify({ oldUrl: OLD_URL, newUrl: NEW_URL, scanned: rows.length, updated, preservedPosted: true }));
process.exit(0);
