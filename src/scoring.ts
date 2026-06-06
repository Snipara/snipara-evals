import {
  type EvalCase,
  type EvalResult,
  type EvalSuiteResult,
  type ExpectedItem,
  type EvidenceMatch,
  type ItemScore,
  type MetricKey,
  type MetricScore,
  type MetricStatus,
  type ObservedRun,
  metricKeys,
} from "./types.js";

export const metricLabels: Record<MetricKey, string> = {
  contextPreservation: "Context Preservation",
  decisionConsistency: "Decision Consistency",
  impactAwareness: "Impact Awareness",
  verificationCoverage: "Verification Coverage",
  continuity: "Continuity",
};

const defaultWeights: Record<MetricKey, number> = {
  contextPreservation: 0.25,
  decisionConsistency: 0.25,
  impactAwareness: 0.2,
  verificationCoverage: 0.2,
  continuity: 0.1,
};

const defaultThresholds: Record<MetricKey | "overall", number> = {
  contextPreservation: 70,
  decisionConsistency: 70,
  impactAwareness: 70,
  verificationCoverage: 70,
  continuity: 70,
  overall: 75,
};

const metricToExpectedKey: Record<MetricKey, keyof NonNullable<EvalCase["expected"]>> = {
  contextPreservation: "context",
  decisionConsistency: "decisions",
  impactAwareness: "impact",
  verificationCoverage: "verification",
  continuity: "continuity",
};

type Corpus = {
  text: string;
  files: string[];
  commands: string[];
  checks: string[];
};

export function evaluateSuite(cases: EvalCase[]): EvalSuiteResult {
  const results = cases.map((item) => evaluateCase(item));
  const score = round(
    results.length === 0
      ? 0
      : results.reduce((sum, result) => sum + result.overall.score, 0) / results.length,
  );
  const failed = results.filter((result) => result.overall.status === "fail").length;
  const passed = results.length - failed;

  return {
    score,
    status: failed === 0 && results.length > 0 ? "pass" : "fail",
    passed,
    failed,
    cases: results,
  };
}

export function evaluateCase(input: EvalCase): EvalResult {
  assertCase(input);

  const corpus = buildCorpus(input.observed ?? {});
  const metrics = metricKeys.map((key) => scoreMetric(input, key, corpus));
  const activeMetrics = metrics.filter((metric) => metric.status !== "not_applicable");
  const overallThreshold = input.thresholds?.overall ?? defaultThresholds.overall;

  if (activeMetrics.length === 0) {
    return {
      id: input.id,
      name: input.name,
      overall: {
        score: 0,
        status: "fail",
        threshold: overallThreshold,
      },
      metrics,
    };
  }

  const totalWeight = activeMetrics.reduce(
    (sum, metric) => sum + (input.weights?.[metric.key] ?? defaultWeights[metric.key]),
    0,
  );
  const score = round(
    activeMetrics.reduce((sum, metric) => {
      const weight = input.weights?.[metric.key] ?? defaultWeights[metric.key];
      return sum + metric.score * (weight / totalWeight);
    }, 0),
  );
  const metricBelowThreshold = activeMetrics.some((metric) => metric.status !== "pass");

  return {
    id: input.id,
    name: input.name,
    overall: {
      score,
      status: score >= overallThreshold && !metricBelowThreshold ? "pass" : "fail",
      threshold: overallThreshold,
    },
    metrics,
  };
}

function scoreMetric(input: EvalCase, key: MetricKey, corpus: Corpus): MetricScore {
  const expectedKey = metricToExpectedKey[key];
  const items = input.expected?.[expectedKey] ?? [];
  const threshold = input.thresholds?.[key] ?? defaultThresholds[key];

  if (items.length === 0) {
    return {
      key,
      label: metricLabels[key],
      score: 0,
      status: "not_applicable",
      threshold,
      items: [],
      summary: "No expectations provided for this metric.",
    };
  }

  const itemScores = items.map((item) => scoreItem(item, key, corpus));
  const totalWeight = itemScores.reduce((sum, item) => sum + item.weight, 0);
  const score = round(
    itemScores.reduce((sum, item) => sum + item.score * (item.weight / totalWeight), 0),
  );
  const status = statusFor(score, threshold);
  const failedItems = itemScores.filter((item) => item.score < threshold).length;

  return {
    key,
    label: metricLabels[key],
    score,
    status,
    threshold,
    items: itemScores,
    summary:
      failedItems === 0
        ? `${items.length}/${items.length} expected signals covered.`
        : `${items.length - failedItems}/${items.length} expected signals covered.`,
  };
}

function scoreItem(item: ExpectedItem, key: MetricKey, corpus: Corpus): ItemScore {
  const phrases = phrasesFor(item, key);
  const matched: EvidenceMatch[] = [];
  const missing: EvidenceMatch[] = [];

  for (const phrase of phrases) {
    const evidence = matchPhrase(phrase, corpus);
    if (evidence) {
      matched.push(evidence);
    } else {
      missing.push({ value: phrase, source: "text" });
    }
  }

  if (item.files) {
    for (const file of item.files) {
      const found = corpus.files.some((changed) => samePathOrSuffix(changed, file)) || includes(corpus.text, file);
      if (found) {
        matched.push({ value: file, source: "file" });
      } else {
        missing.push({ value: file, source: "file" });
      }
    }
  }

  if (item.command) {
    const found =
      corpus.commands.some((command) => commandMatches(command, item.command ?? "")) ||
      includes(corpus.text, item.command);
    if (found) {
      matched.push({ value: item.command, source: "command" });
    } else {
      missing.push({ value: item.command, source: "command" });
    }
  }

  const rejected = (item.rejectedKeywords ?? [])
    .filter((phrase) => includes(corpus.text, phrase))
    .map((phrase) => ({ value: phrase, source: "negative" as const }));

  const positiveTotal = matched.length + missing.length;
  const baseScore = positiveTotal === 0 ? 100 : (matched.length / positiveTotal) * 100;
  const penalty = Math.min(70, rejected.length * 30);
  const decisionCap = key === "decisionConsistency" && rejected.length > 0 ? 40 : 100;
  const score = round(Math.max(0, Math.min(decisionCap, baseScore - penalty)));

  return {
    id: item.id,
    score,
    weight: item.weight ?? 1,
    matched,
    missing,
    rejected,
  };
}

function phrasesFor(item: ExpectedItem, key: MetricKey): string[] {
  if (item.keywords && item.keywords.length > 0) {
    return unique(item.keywords);
  }

  const source =
    key === "decisionConsistency"
      ? item.statement
      : key === "impactAwareness"
        ? item.target
        : key === "verificationCoverage"
          ? item.check
          : key === "continuity"
            ? item.handoff
            : item.text;

  return source ? significantTerms(source) : [];
}

function matchPhrase(phrase: string, corpus: Corpus): EvidenceMatch | null {
  if (includes(corpus.text, phrase)) {
    return { value: phrase, source: "text" };
  }

  if (corpus.commands.some((command) => commandMatches(command, phrase))) {
    return { value: phrase, source: "command" };
  }

  if (corpus.checks.some((check) => includes(check, phrase))) {
    return { value: phrase, source: "check" };
  }

  if (corpus.files.some((file) => samePathOrSuffix(file, phrase))) {
    return { value: phrase, source: "file" };
  }

  return null;
}

function buildCorpus(observed: ObservedRun): Corpus {
  const files = observed.filesChanged ?? [];
  const commands = observed.commandsRun ?? [];
  const checks = (observed.checks ?? []).map((check) =>
    [check.name, check.status, check.command].filter(Boolean).join(" "),
  );
  const artifactText = (observed.artifacts ?? [])
    .map((artifact) => [artifact.path, artifact.content].filter(Boolean).join(" "))
    .join("\n");
  const text = [
    observed.answer,
    observed.transcript,
    files.join("\n"),
    commands.join("\n"),
    checks.join("\n"),
    artifactText,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    text: normalize(text),
    files,
    commands,
    checks,
  };
}

function assertCase(input: EvalCase): void {
  if (!input || typeof input !== "object") {
    throw new Error("Eval case must be an object.");
  }

  if (!input.id || typeof input.id !== "string") {
    throw new Error("Eval case requires a string id.");
  }
}

function significantTerms(value: string): string[] {
  return unique(
    normalize(value)
      .split(" ")
      .filter((term) => term.length >= 4)
      .slice(0, 12),
  );
}

function statusFor(score: number, threshold: number): MetricStatus {
  if (score >= threshold) {
    return "pass";
  }

  if (score >= Math.max(0, threshold - 15)) {
    return "warn";
  }

  return "fail";
}

function includes(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle));
}

function commandMatches(command: string, expected: string): boolean {
  const normalizedCommand = normalize(command);
  const normalizedExpected = normalize(expected);
  return normalizedCommand === normalizedExpected || normalizedCommand.includes(normalizedExpected);
}

function samePathOrSuffix(actual: string, expected: string): boolean {
  const cleanActual = normalizePath(actual);
  const cleanExpected = normalizePath(expected);
  return cleanActual === cleanExpected || cleanActual.endsWith(`/${cleanExpected}`);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.?\//, "").trim().toLowerCase();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`"']/g, "")
    .replace(/[^a-z0-9./:_+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
