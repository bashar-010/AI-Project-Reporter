import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

export function extractZip(zipPath) {
  const absZip = path.resolve(zipPath);

  if (!fs.existsSync(absZip)) {
    throw new Error("ZIP not found: " + absZip);
  }

  const zipName = path.basename(absZip, ".zip");
  const extractDir = path.resolve("tmp", zipName);

  // أنشئ tmp لو مش موجود
  if (!fs.existsSync("tmp")) {
    fs.mkdirSync("tmp");
  }

  // نظّف الفولدر لو موجود
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }

  fs.mkdirSync(extractDir);

  const zip = new AdmZip(absZip);
  zip.extractAllTo(extractDir, true);

  return extractDir;
}
