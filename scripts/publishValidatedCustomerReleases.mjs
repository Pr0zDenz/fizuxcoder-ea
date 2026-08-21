import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inArray } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { productFiles, protectedDeliveryAudits } from "../drizzle/schema.ts";
import { storagePut } from "../server/storage.ts";

const commit = process.env.COMMIT_RELEASE === "true";
const maxUploadBytes = 45 * 1024 * 1024;

const releases = [
  {
    productId: "gemini-bot-ea",
    archivePath: "/home/ubuntu/upload/pasted_file_of9cKt_GeminiBotEA-MQL5.zip",
    archiveFileName: "GeminiBotEA-MQL5-v11.97.zip",
    archiveDisplayName: "Gemini Bot EA v11.97 — Complete MQL5 package",
    guidePath: "/home/ubuntu/fizuxcoder-ea-brochure/docs/GEMINI_BOT_CUSTOMER_README.md",
    guideFileName: "README_Gemini_Bot_EA_v11.97.md",
    guideDisplayName: "Gemini Bot EA v11.97 — Installation and licence guide",
    expectedSha256: "9a1378122de32bf545a797c5deea41d24b1d658f56c67785d635597a34effb16",
    legacyFileIds: [1, 2, 3, 60001, 60002],
  },
  {
    productId: "3s-universal-ea",
    archivePath: "/home/ubuntu/upload/pasted_file_zefERJ_3SUniversalEA-MQL5.zip",
    archiveFileName: "3SUniversalEA-MQL5-customer-license.zip",
    archiveDisplayName: "3S Serangkai UNIVERSAL EA — Complete MQL5 customer-license package",
    guidePath: "/home/ubuntu/fizuxcoder-ea-brochure/docs/3S_UNIVERSAL_CUSTOMER_README.md",
    guideFileName: "README_3S_Universal_EA.md",
    guideDisplayName: "3S Serangkai UNIVERSAL EA — Installation, activation, and security guide",
    expectedSha256: "b9388896e42f85c7b77874f4b1bfe16503a0db07db638a0466b9e3a64cbf715c",
    legacyFileIds: [4, 5, 6, 7, 8, 9, 10, 90001, 90002],
  },
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function storageKey(productId, fileName) {
  return `protected-packages/${productId}/releases/2026-08-22-${fileName}`;
}

async function readAndVerify(path, expectedSha256) {
  const bytes = await readFile(path);
  if (!bytes.length || bytes.length > maxUploadBytes) {
    throw new Error(`Refusing ${path}: file must be non-empty and no larger than 45 MB`);
  }
  if (expectedSha256 && sha256(bytes) !== expectedSha256) {
    throw new Error(`Refusing ${path}: SHA-256 does not match the validated release manifest`);
  }
  return bytes;
}

const db = await getDb();
if (!db) throw new Error("Database is unavailable");

const prepared = [];
for (const release of releases) {
  const archive = await readAndVerify(release.archivePath, release.expectedSha256);
  const guide = await readAndVerify(release.guidePath);
  prepared.push({ ...release, archive, guide });
}

const legacyIds = prepared.flatMap(release => release.legacyFileIds);
const currentRows = await db
  .select({ id: productFiles.id, productId: productFiles.productId })
  .from(productFiles)
  .where(inArray(productFiles.id, legacyIds));

const currentIds = new Set(currentRows.map(row => row.id));
if (currentIds.size !== legacyIds.length || legacyIds.some(id => !currentIds.has(id))) {
  throw new Error("Refusing publication: protected-library inventory changed after the rollback snapshot");
}

for (const release of prepared) {
  const mismatched = currentRows.some(row => release.legacyFileIds.includes(row.id) && row.productId !== release.productId);
  if (mismatched) throw new Error(`Refusing publication: legacy file ownership mismatch for ${release.productId}`);
}

const auditRows = await db
  .select({ id: protectedDeliveryAudits.id, fileId: protectedDeliveryAudits.fileId })
  .from(protectedDeliveryAudits)
  .where(inArray(protectedDeliveryAudits.fileId, legacyIds));
if (auditRows.length) {
  throw new Error("Refusing publication: legacy files are referenced by delivery audits and cannot be retired safely");
}

const preview = prepared.map(release => ({
  productId: release.productId,
  archiveFileName: release.archiveFileName,
  archiveSha256: sha256(release.archive),
  archiveBytes: release.archive.length,
  guideFileName: release.guideFileName,
  guideBytes: release.guide.length,
  retireFileIds: release.legacyFileIds,
}));

if (!commit) {
  console.log(JSON.stringify({ mode: "dry-run", releases: preview }, null, 2));
  process.exit(0);
}

const uploaded = [];
for (const release of prepared) {
  const archive = await storagePut(storageKey(release.productId, release.archiveFileName), release.archive, "application/zip");
  const guide = await storagePut(storageKey(release.productId, release.guideFileName), release.guide, "text/markdown; charset=utf-8");
  uploaded.push({ release, archive, guide });
}

await db.transaction(async tx => {
  await tx.delete(productFiles).where(inArray(productFiles.id, legacyIds));
  for (const item of uploaded) {
    await tx.insert(productFiles).values([
      {
        productId: item.release.productId,
        displayName: item.release.archiveDisplayName,
        fileName: item.release.archiveFileName,
        storageKey: item.archive.key,
        contentType: "application/zip",
      },
      {
        productId: item.release.productId,
        displayName: item.release.guideDisplayName,
        fileName: item.release.guideFileName,
        storageKey: item.guide.key,
        contentType: "text/markdown; charset=utf-8",
      },
    ]);
  }
});

console.log(JSON.stringify({ mode: "committed", releases: uploaded.map(item => ({
  productId: item.release.productId,
  archive: { fileName: item.release.archiveFileName, storageKey: item.archive.key },
  guide: { fileName: item.release.guideFileName, storageKey: item.guide.key },
})) }, null, 2));
