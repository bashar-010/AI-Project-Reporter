import fs from "fs";
import path from "path";

function walk(dir, maxFiles = 2000) {
  const results = [];
  const stack = [dir];

  while (stack.length && results.length < maxFiles) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const e of entries) {
      if (results.length >= maxFiles) break;

      // تجاهل فولدرات ثقيلة
      if (e.isDirectory() && ["node_modules", ".git", "dist", "build", ".next", "out"].includes(e.name)) {
        continue;
      }

      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      else results.push(full);
    }
  }

  return results;
}

export function collectProjectInfo(projectPath) {
  const abs = path.resolve(projectPath);
  const allFiles = walk(abs);

  const rel = (p) => path.relative(abs, p).replaceAll("\\", "/");

  const relFiles = allFiles.map(rel);

  const hasReadme = relFiles.some(f => f.toLowerCase() === "readme.md");
  const hasEnvExample = relFiles.some(f => f.toLowerCase() === ".env.example");
  const hasPackageJson = relFiles.includes("package.json");
  const hasPomXml = relFiles.includes("pom.xml");
  const hasCsproj = relFiles.some(f => f.endsWith(".csproj"));

  // عدّ اللغات تقريبياً من الامتدادات
  const counts = {};
  for (const f of relFiles) {
    const ext = path.extname(f).toLowerCase() || "no_ext";
    counts[ext] = (counts[ext] || 0) + 1;
  }

  return {
    projectPath: abs,
    totalFiles: relFiles.length,
    sampleFiles: relFiles.slice(0, 80),
    signals: {
      hasReadme,
      hasEnvExample,
      hasPackageJson,
      hasPomXml,
      hasCsproj
    },
    extensionCounts: Object.entries(counts)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 15)
      .map(([ext, n]) => ({ ext, n }))
  };
}