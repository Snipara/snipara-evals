/**
 * Reporting and formatting for snipara-evals results.
 *
 * Converts evaluation results (per-case scores, metrics, overall verdicts)
 * into human-readable terminal output with color-coded status (pass/warn/fail).
 * Supports both case-level and suite-level formatting.
 */
import { type EvalResult, type EvalSuiteResult, type MetricStatus } from "./types.js";

/**
 * Format a suite result into human-readable terminal output.
 */
export function formatSuite(result: EvalSuiteResult): string {
  const lines = [
    `snipara-evals suite: ${result.score.toFixed(1)} ${statusLabel(result.status)}`,
    `Cases: ${result.passed} passed, ${result.failed} failed`,
    "",
  ];

  for (const item of result.cases) {
    lines.push(...formatCase(item).split("\n"), "");
  }

  return lines.join("\n").trimEnd();
}

export function formatCase(result: EvalResult): string {
  const lines = [
    `Case: ${result.name ?? result.id}`,
    `Overall: ${result.overall.score.toFixed(1)} ${statusLabel(result.overall.status)} (threshold ${result.overall.threshold})`,
    "",
  ];

  for (const metric of result.metrics) {
    if (metric.status === "not_applicable") {
      continue;
    }

    lines.push(
      `${metric.label}: ${metric.score.toFixed(1)} ${statusLabel(metric.status)} (threshold ${metric.threshold})`,
      `  ${metric.summary}`,
    );

    for (const item of metric.items) {
      const missing = item.missing.map((evidence) => evidence.value).join(", ");
      const rejected = item.rejected.map((evidence) => evidence.value).join(", ");
      const suffix = [
        missing ? `missing: ${missing}` : "",
        rejected ? `rejected: ${rejected}` : "",
      ]
        .filter(Boolean)
        .join("; ");
      lines.push(`  - ${item.id}: ${item.score.toFixed(1)}${suffix ? ` (${suffix})` : ""}`);
    }
  }

  return lines.join("\n");
}

function statusLabel(status: MetricStatus): string {
  switch (status) {
    case "pass":
      return "PASS";
    case "warn":
      return "WARN";
    case "fail":
      return "FAIL";
    case "not_applicable":
      return "N/A";
  }
}
