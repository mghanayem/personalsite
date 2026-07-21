/**
 * One-time migration: download uploaded images from the deployed app
 * (while the old disk-based code is still running) and upload them to GCS.
 *
 * Run: node scripts/migrate-uploads-to-gcs.mjs
 */

const SIDECAR = "http://127.0.0.1:1106";
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const DEPLOYED_HOST = process.env.REPLIT_DOMAINS;

if (!BUCKET_ID) { console.error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set"); process.exit(1); }
if (!DEPLOYED_HOST) { console.error("REPLIT_DOMAINS not set"); process.exit(1); }

async function getSignedUrl(filename, method = "PUT") {
  const resp = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: BUCKET_ID,
      object_name: `uploads/${filename}`,
      method,
      expires_at: new Date(Date.now() + 900_000).toISOString(),
    }),
  });
  if (!resp.ok) throw new Error(`Sign failed ${resp.status}: ${await resp.text()}`);
  const { signed_url } = await resp.json();
  return signed_url;
}

async function existsInGCS(filename) {
  try {
    const url = await getSignedUrl(filename, "HEAD");
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

async function uploadToGCS(filename, buffer, mime) {
  const url = await getSignedUrl(filename);
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: buffer,
  });
  if (!r.ok) throw new Error(`PUT failed ${r.status}: ${await r.text()}`);
}

function mimeFor(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// All filenames to migrate: known from DB + deployment logs
const filenames = [
  // From deployment logs (production images on prod disk)
  "0e0131b9-c95a-414c-888a-fcd9d10b7bce.jpeg",
  "5abf5d79-6807-4907-afc3-0262c1c40278.jpg",
  "3c6eda61-8749-4e53-b296-33790ad53e69.jpg",
  "cca647b4-3e32-4256-bea7-4c24ac8afcae.jpg",
  "02dc02e5-ca67-46d5-857d-d108242ec238.jpg",
  "a2478f64-2457-4e3e-9726-d2b0fe2265d0.jpg",
  "a954d185-e3eb-42e7-ba23-d47019593c02.jpg",
  // From dev DB
  "f7546cd7-3ea2-43ce-9621-3ff63795c976.jpg",
  "2b78831d-3fe6-49dd-92ce-f5addc81921d.jpg",
  // Default OG image
  "og-default.jpg",
];

let ok = 0, skip = 0, fail = 0;

for (const filename of filenames) {
  // Skip if already in GCS
  if (await existsInGCS(filename)) {
    console.log(`⏭  ${filename} (already in GCS)`);
    skip++;
    continue;
  }

  // Try fetching from deployed URL (old code still serving from disk)
  const url = `https://${DEPLOYED_HOST}/api/uploads/${filename}`;
  let buf;
  try {
    const resp = await fetch(url);
    if (!resp.ok) { console.log(`⚠️  ${filename}: HTTP ${resp.status} from deployed (skip)`); fail++; continue; }
    buf = Buffer.from(await resp.arrayBuffer());
  } catch (e) {
    console.log(`⚠️  ${filename}: fetch error — ${e.message} (skip)`);
    fail++;
    continue;
  }

  try {
    await uploadToGCS(filename, buf, mimeFor(filename));
    console.log(`✅ ${filename} (${buf.length} bytes)`);
    ok++;
  } catch (e) {
    console.error(`❌ ${filename}: upload error — ${e.message}`);
    fail++;
  }
}

// Also migrate dev disk files
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
const DEV_DIR = new URL("../public/uploads", import.meta.url).pathname;
if (existsSync(DEV_DIR)) {
  const diskFiles = await readdir(DEV_DIR);
  for (const filename of diskFiles) {
    if (filenames.includes(filename)) continue; // already handled above
    if (await existsInGCS(filename)) { console.log(`⏭  ${filename} (already in GCS)`); skip++; continue; }
    try {
      const buf = await readFile(new URL(`../public/uploads/${filename}`, import.meta.url).pathname);
      await uploadToGCS(filename, buf, mimeFor(filename));
      console.log(`✅ ${filename} from disk (${buf.length} bytes)`);
      ok++;
    } catch (e) {
      console.error(`❌ ${filename}:`, e.message);
      fail++;
    }
  }
}

console.log(`\nDone: ${ok} migrated, ${skip} skipped, ${fail} failed.`);
