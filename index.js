import "dotenv/config";
import fs from "fs";
import path from "path";

import { collectProjectInfo } from "./src/collect.js";
import { runStaticTools } from "./src/runTools.js";
import { summarizeAutopsy } from "./src/summarizeAI.js";
import { renderMarkdown, saveReport } from "./src/render.js";
import { generatePDF } from "./src/pdf.js";
import { extractZip } from "./src/zip.js";

function getTargetFromArgs() {
  return process.argv.slice(2).join(" ").trim() || ".";
}

function safeName(str) {
  return String(str || "project")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50);
}

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(
    d.getHours()
  )}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

async function main() {
  const target = getTargetFromArgs();

  let projectPath = target;

  if (target.toLowerCase().endsWith(".zip")) {
    console.log("ZIP detected, extracting...");
    projectPath = extractZip(target);
  }

  const absProjectPath = path.resolve(projectPath);

  if (!fs.existsSync(absProjectPath)) {
    console.error("Target path not found:", absProjectPath);
    process.exit(1);
  }

  // ✅ اجمع معلومات المشروع الحقيقي
  const info = collectProjectInfo(absProjectPath);

  // ✅ شغّل أدوات على المشروع الحقيقي (مو وهمي)
  const tools = await runStaticTools(absProjectPath);

  const report = await summarizeAutopsy({
    project: info,
    tools
  });

  const finalReport = typeof report === "string" ? JSON.parse(report) : report;

  const markdown = renderMarkdown(finalReport);

  const base = safeName(path.basename(absProjectPath)) + "_" + nowStamp();
  const mdPath = saveReport(markdown, `autopsy-${base}.md`);
  const pdfPath = await generatePDF(mdPath, `reports/autopsy-${base}.pdf`);

  console.log("Target analyzed:", absProjectPath);
  console.log("Markdown report:", mdPath);
  console.log("PDF report:", pdfPath);
}

main();