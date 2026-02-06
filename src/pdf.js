import markdownpdf from "markdown-pdf";
import path from "path";
import fs from "fs";

export function generatePDF(
  mdFile = "reports/autopsy-report.md",
  pdfFile = "reports/autopsy-report.pdf"
) {
  const mdPath = path.resolve(mdFile);
  const pdfPath = path.resolve(pdfFile);

  if (!fs.existsSync(mdPath)) {
    throw new Error("Markdown report not found: " + mdPath);
  }

  return new Promise((resolve, reject) => {
    markdownpdf()
      .from(mdPath)
      .to(pdfPath, () => {
        resolve(pdfPath);
      });
  });
}