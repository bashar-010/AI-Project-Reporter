import OpenAI from "openai";

function localFallbackReport(data) {
  const issues = [];
  const heur = data?.tools?.heuristics || {};
  const docs = heur.docs || {};
  const tests = heur.tests || {};
  const type = heur.projectType || {};

  const auditSummary = data?.tools?.npmAudit?.summary || null;
  const semgrepSummary = data?.tools?.semgrep?.summary || null;

  if (!docs.hasReadme) {
    issues.push({
      severity: "high",
      title: "Missing README.md",
      impact: "Hard to run/understand the project; onboarding is slow.",
      fix: ["Add README with setup, run steps, and project overview."]
    });
  }

  if (!docs.hasEnvExample) {
    issues.push({
      severity: "medium",
      title: "Missing .env.example",
      impact: "Hand-off/deployment becomes confusing; env vars get lost.",
      fix: ["Create .env.example listing required env vars (no secrets)."]
    });
  }

  if (!tests.hasTests) {
    issues.push({
      severity: "medium",
      title: "No tests detected",
      impact: "Refactors break features silently; reliability is lower.",
      fix: ["Add basic smoke tests for core flows.", "Add CI to run tests."]
    });
  }

  if (type.node && auditSummary) {
    const total = auditSummary.total ?? 0;
    if (total > 0) {
      issues.push({
        severity: "high",
        title: `npm audit reports vulnerabilities (total: ${total})`,
        impact: "Dependencies may contain known security issues.",
        fix: ["Run `npm audit fix` (review changes).", "Upgrade vulnerable packages."]
      });
    } else {
      issues.push({
        severity: "low",
        title: "npm audit: no vulnerabilities reported",
        impact: "No known dependency vulnerabilities detected (good baseline).",
        fix: ["Keep dependencies updated periodically."]
      });
    }
  }

  if (semgrepSummary && typeof semgrepSummary.total === "number") {
    if (semgrepSummary.total > 0) {
      issues.push({
        severity: "high",
        title: `Semgrep findings detected (total: ${semgrepSummary.total})`,
        impact: "Potential insecure patterns or risky code paths exist.",
        fix: ["Review findings by severity.", "Fix CRITICAL/HIGH first."]
      });
    } else {
      issues.push({
        severity: "low",
        title: "Semgrep: no findings detected",
        impact: "No security patterns matched (good signal, not a guarantee).",
        fix: ["Keep semgrep in your pipeline for future changes."]
      });
    }
  }

  issues.push({
    severity: "medium",
    title: "No evidence of lint/format standards enforced",
    impact: "Code consistency drifts and maintenance becomes harder.",
    fix: ["Add linter/formatter and run it in CI."]
  });

  let level = "green";
  const highCount = issues.filter(i => i.severity === "high").length;
  if (highCount >= 1) level = "yellow";
  if (highCount >= 2) level = "red";

  return {
    title: "Project Autopsy Report (Local Analysis)",
    executive_summary:
      "This report is generated using local scans (project structure, npm audit, semgrep where available). It prioritizes practical issues affecting maintainability and security.",
    verdict: {
      level,
      reason:
        level === "green"
          ? "Project looks healthy; only baseline improvements recommended."
          : level === "yellow"
          ? "Project is workable but has important gaps that should be addressed."
          : "Project has major issues; expect rework before safe scaling."
    },
    top_issues: issues
  };
}

export async function summarizeAutopsy(data) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return localFallbackReport(data);

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-5",
      input: `
Return strict JSON with:
- title
- executive_summary
- verdict { level, reason }
- top_issues [{ severity, title, impact, fix[] }]

DATA:
${JSON.stringify(data, null, 2)}
`
    });

    return response.output_text;
  } catch (err) {
    const msg = String(err?.message || "");
    const code = err?.code || err?.error?.code;

    if (msg.includes("insufficient_quota") || code === "insufficient_quota") {
      return localFallbackReport(data);
    }

    throw err;
  }
}