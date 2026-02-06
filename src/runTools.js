import fs from "fs";
import path from "path";
import { execa } from "execa";

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

function findFileRecursive(root, fileName, maxDepth = 4) {
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (depth > maxDepth) continue;

    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }

    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", ".next", "out"].includes(e.name)) continue;
        queue.push({ dir: full, depth: depth + 1 });
      } else {
        if (e.name.toLowerCase() === fileName.toLowerCase()) return full;
      }
    }
  }
  return null;
}

async function runNpmAudit(projectPath) {
  // npm audit يحتاج مشروع Node (package.json)
  try {
    const { stdout } = await execa("npm", ["audit", "--json"], { cwd: projectPath, timeout: 120000 });
    return { ok: true, raw: stdout };
  } catch (e) {
    // npm audit ممكن يرجع exit code غير 0 حتى لو أعطى JSON
    const raw = e?.stdout || e?.stderr || "";
    return { ok: false, raw };
  }
}

async function runSemgrep(projectPath) {
  // يعتمد إن semgrep مثبت على جهازك
  try {
    const { stdout } = await execa(
      "semgrep",
      ["--config", "p/ci", "--json", "--quiet"],
      { cwd: projectPath, timeout: 180000 }
    );
    return { ok: true, raw: stdout };
  } catch (e) {
    const raw = e?.stdout || e?.stderr || "";
    return { ok: false, raw, notInstalled: /not recognized|command not found/i.test(raw) };
  }
}

function quickHeuristics(projectPath) {
  const rootFiles = (() => {
    try { return fs.readdirSync(projectPath); } catch { return []; }
  })();

  const hasReadme = rootFiles.some(f => f.toLowerCase() === "readme.md") || !!findFileRecursive(projectPath, "README.md");
  const hasEnvExample = rootFiles.some(f => f.toLowerCase() === ".env.example") || !!findFileRecursive(projectPath, ".env.example");
  const hasTests =
    !!findFileRecursive(projectPath, "jest.config.js") ||
    !!findFileRecursive(projectPath, "pytest.ini") ||
    !!findFileRecursive(projectPath, "test") ||
    !!findFileRecursive(projectPath, "__tests__");

  const packageJsonPath = findFileRecursive(projectPath, "package.json");
  const pomXmlPath = findFileRecursive(projectPath, "pom.xml");
  const csprojPath = (() => {
    // أي ملف .csproj
    const queue = [projectPath];
    while (queue.length) {
      const dir = queue.pop();
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (["node_modules", ".git", "dist", "build", ".next", "out"].includes(e.name)) continue;
          queue.push(full);
        } else if (e.name.toLowerCase().endsWith(".csproj")) {
          return full;
        }
      }
    }
    return null;
  })();

  return {
    docs: { hasReadme, hasEnvExample },
    tests: { hasTests },
    projectType: {
      node: !!packageJsonPath,
      java: !!pomXmlPath,
      dotnet: !!csprojPath
    },
    paths: {
      packageJsonPath,
      pomXmlPath,
      csprojPath
    }
  };
}

function summarizeAudit(raw) {
  // يحاول يطلع عدد vulnerabilities بشكل مبسط من JSON
  try {
    const j = JSON.parse(raw);
    // npm v7+:
    const meta = j?.metadata?.vulnerabilities;
    if (meta) {
      return {
        total: Object.values(meta).reduce((a, b) => a + b, 0),
        breakdown: meta
      };
    }
    // npm v6 style:
    const advisories = j?.advisories ? Object.keys(j.advisories).length : null;
    if (advisories !== null) return { total: advisories };
  } catch {}
  return null;
}

function summarizeSemgrep(raw) {
  try {
    const j = JSON.parse(raw);
    const results = j?.results || [];
    const bySeverity = {};
    for (const r of results) {
      const sev = (r?.extra?.severity || "UNKNOWN").toUpperCase();
      bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    }
    return { total: results.length, bySeverity };
  } catch {}
  return null;
}

export async function runStaticTools(projectPath) {
  const heur = quickHeuristics(projectPath);

  const out = {
    heuristics: heur,
    npmAudit: null,
    semgrep: null,
    notes: []
  };

  // Node audit
  if (heur.projectType.node && heur.paths.packageJsonPath) {
    const pkgDir = path.dirname(heur.paths.packageJsonPath);
    const auditRes = await runNpmAudit(pkgDir);
    out.npmAudit = {
      ok: auditRes.ok,
      summary: summarizeAudit(auditRes.raw),
      rawPreview: (auditRes.raw || "").slice(0, 5000) // ما نكبّر
    };
  } else {
    out.notes.push("No Node package.json detected -> skipped npm audit.");
  }

  // Semgrep
  const sem = await runSemgrep(projectPath);
  if (sem.notInstalled) {
    out.notes.push("Semgrep not installed -> skipped security scan.");
    out.semgrep = { ok: false, notInstalled: true };
  } else {
    out.semgrep = {
      ok: sem.ok,
      summary: summarizeSemgrep(sem.raw),
      rawPreview: (sem.raw || "").slice(0, 5000)
    };
  }

  return out;
}