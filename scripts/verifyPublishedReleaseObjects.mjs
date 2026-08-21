import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { productFiles } from "../drizzle/schema.ts";
import { storageGetSignedUrl } from "../server/storage.ts";

const expected = [
  {
    productId: "gemini-bot-ea",
    archiveFileName: "GeminiBotEA-MQL5-v11.97.zip",
    localArchive: "/home/ubuntu/upload/pasted_file_of9cKt_GeminiBotEA-MQL5.zip",
    guideFileName: "README_Gemini_Bot_EA_v11.97.md",
    localGuide: "/home/ubuntu/fizuxcoder-ea-brochure/docs/GEMINI_BOT_CUSTOMER_README.md",
  },
  {
    productId: "3s-universal-ea",
    archiveFileName: "3SUniversalEA-MQL5-customer-license.zip",
    localArchive: "/home/ubuntu/upload/pasted_file_zefERJ_3SUniversalEA-MQL5.zip",
    guideFileName: "README_3S_Universal_EA.md",
    localGuide: "/home/ubuntu/fizuxcoder-ea-brochure/docs/3S_UNIVERSAL_CUSTOMER_README.md",
  },
];

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const db = await getDb();
if (!db) throw new Error("Database is unavailable");

const results = [];
for (const release of expected) {
  for (const [kind, fileName, localPath] of [
    ["archive", release.archiveFileName, release.localArchive],
    ["guide", release.guideFileName, release.localGuide],
  ]) {
    const row = (await db
      .select({ id: productFiles.id, storageKey: productFiles.storageKey, contentType: productFiles.contentType })
      .from(productFiles)
      .where(and(eq(productFiles.productId, release.productId), eq(productFiles.fileName, fileName)))
      .limit(1))[0];
    if (!row) throw new Error(`Missing registered ${kind} for ${release.productId}`);

    const [local, signedUrl] = await Promise.all([readFile(localPath), storageGetSignedUrl(row.storageKey)]);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Storage retrieval failed for ${fileName}: HTTP ${response.status}`);
    const remote = Buffer.from(await response.arrayBuffer());
    if (hash(remote) !== hash(local)) throw new Error(`Stored byte mismatch for ${fileName}`);

    results.push({ productId: release.productId, kind, fileId: row.id, fileName, contentType: row.contentType, bytes: remote.length, sha256: hash(remote) });
  }
}

console.log(JSON.stringify({ verified: true, mode: "privileged-storage-byte-check", results }, null, 2));
