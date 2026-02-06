import fs from "fs";
import path from "path";

export function renderMarkdown(report) {
  let md = `# ${report.title}\n\n`;

  md += `## Executive Summary\n${report.executive_summary}\n\n`;

  md += `## Verdict\n`;
  md += `**Level:** ${report.verdict.level.toUpperCase()}\n\n`;
  md += `${report.verdict.reason}\n\n`;

  md += `## Top Issues\n`;

  report.top_issues.forEach((issue, index) => {
    md += `### ${index + 1}. ${issue.title}\n`;
    md += `- **Severity:** ${issue.severity}\n`;
    md += `- **Impact:** ${issue.impact}\n`;
    md += `- **Fix:**\n`;
    issue.fix.forEach(f => {
      md += `  - ${f}\n`;
    });
    md += `\n`;
  });

  return md;
}

export function saveReport(markdown, fileName = "autopsy-report.md") {
  const reportsDir = path.resolve("reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }

  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, markdown, "utf-8");

  return filePath;
}
