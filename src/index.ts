/**
 * Public API for snipara-evals — Project Intelligence scoring harness.
 *
 * Exports the evaluation functions (evaluateCase, evaluateSuite) that score
 * agent work against expected context, decisions, impact, verification, and
 * continuity signals. No LLM judge required; deterministic scoring by keyword
 * and file matching.
 */
export { evaluateCase, evaluateSuite, metricLabels } from "./scoring.js";
export { formatCase, formatSuite } from "./report.js";
export type {
  EvalCase,
  EvalResult,
  EvalSuiteResult,
  ExpectedItem,
  ExpectedSignals,
  ItemScore,
  MetricKey,
  MetricScore,
  ObservedRun,
} from "./types.js";
