/**
 * Domain types for Project Intelligence evals.
 *
 * Defines the case format (expected signals vs observed agent output), metrics
 * (context preservation, decision consistency, impact awareness, verification
 * coverage, continuity), and scoring results. Expected signals use keyword and
 * file matching; agent output is text-based observation of what was preserved.
 */

export const metricKeys = [
  "contextPreservation",
  "decisionConsistency",
  "impactAwareness",
  "verificationCoverage",
  "continuity",
] as const;

export type MetricKey = (typeof metricKeys)[number];

export type MetricStatus = "pass" | "warn" | "fail" | "not_applicable";

export type ExpectedItem = {
  id: string;
  text?: string;
  statement?: string;
  target?: string;
  check?: string;
  command?: string;
  handoff?: string;
  keywords?: string[];
  rejectedKeywords?: string[];
  files?: string[];
  weight?: number;
};

export type ExpectedSignals = {
  context?: ExpectedItem[];
  decisions?: ExpectedItem[];
  impact?: ExpectedItem[];
  verification?: ExpectedItem[];
  continuity?: ExpectedItem[];
};

export type ObservedCheck = {
  name: string;
  status?: "pass" | "fail" | "skipped" | "unknown";
  command?: string;
};

export type ObservedArtifact = {
  path?: string;
  content?: string;
};

export type ObservedRun = {
  answer?: string;
  transcript?: string;
  filesChanged?: string[];
  commandsRun?: string[];
  checks?: ObservedCheck[];
  artifacts?: ObservedArtifact[];
};

export type EvalCase = {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
  expected?: ExpectedSignals;
  observed?: ObservedRun;
  weights?: Partial<Record<MetricKey, number>>;
  thresholds?: Partial<Record<MetricKey | "overall", number>>;
};

export type EvidenceMatch = {
  value: string;
  source: "text" | "file" | "command" | "check" | "negative";
};

export type ItemScore = {
  id: string;
  score: number;
  weight: number;
  matched: EvidenceMatch[];
  missing: EvidenceMatch[];
  rejected: EvidenceMatch[];
};

export type MetricScore = {
  key: MetricKey;
  label: string;
  score: number;
  status: MetricStatus;
  threshold: number;
  items: ItemScore[];
  summary: string;
};

export type EvalResult = {
  id: string;
  name?: string;
  overall: {
    score: number;
    status: MetricStatus;
    threshold: number;
  };
  metrics: MetricScore[];
};

export type EvalSuiteResult = {
  score: number;
  status: MetricStatus;
  passed: number;
  failed: number;
  cases: EvalResult[];
};
