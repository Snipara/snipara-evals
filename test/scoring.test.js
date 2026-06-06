import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import { evaluateCase } from "../dist/index.js";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("scores a well-covered Project Intelligence case", () => {
  const result = evaluateCase({
    id: "covered",
    expected: {
      context: [{ id: "stack", keywords: ["Mini Snipara", "memory"] }],
      decisions: [
        {
          id: "hosted",
          keywords: ["code graph", "hosted"],
          rejectedKeywords: ["open source code graph"],
        },
      ],
      impact: [{ id: "cli", keywords: ["CLI"], files: ["src/cli.ts"] }],
      verification: [{ id: "test", command: "pnpm test", keywords: ["tests pass"] }],
      continuity: [{ id: "handoff", keywords: ["handoff", "next step"] }],
    },
    observed: {
      answer:
        "Mini Snipara includes memory. The code graph stays hosted. The CLI changed in src/cli.ts. tests pass. Handoff: next step is release prep.",
      filesChanged: ["src/cli.ts"],
      commandsRun: ["pnpm test"],
    },
  });

  assert.equal(result.overall.status, "pass");
  assert.ok(result.overall.score >= 90);
});

test("penalizes rejected decision directions", () => {
  const result = evaluateCase({
    id: "rejected-direction",
    expected: {
      decisions: [
        {
          id: "hosted",
          keywords: ["code graph", "hosted"],
          rejectedKeywords: ["open source code graph"],
        },
      ],
    },
    observed: {
      answer: "The code graph should be hosted, but we will also open source code graph internals.",
    },
  });

  const decision = result.metrics.find((metric) => metric.key === "decisionConsistency");
  assert.equal(decision?.status, "fail");
  assert.ok((decision?.score ?? 100) <= 40);
});

test("matches verification commands from structured command data", () => {
  const result = evaluateCase({
    id: "commands",
    expected: {
      verification: [{ id: "test", command: "pnpm test" }],
    },
    observed: {
      commandsRun: ["pnpm test"],
    },
  });

  const verification = result.metrics.find((metric) => metric.key === "verificationCoverage");
  assert.equal(verification?.status, "pass");
});

test("marks the overall case failed when a metric is below threshold", () => {
  const result = evaluateCase({
    id: "below-threshold",
    expected: {
      context: [
        {
          id: "partial",
          keywords: ["alpha", "beta", "gamma"],
        },
      ],
    },
    observed: {
      answer: "alpha beta",
    },
  });

  const context = result.metrics.find((metric) => metric.key === "contextPreservation");
  assert.equal(context?.status, "warn");
  assert.equal(result.overall.status, "fail");
});

test("CLI returns JSON suite output", () => {
  const fixture = join(repoRoot, "examples/project-intelligence-case.json");
  const run = spawnSync(process.execPath, ["dist/cli.js", "run", fixture, "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(run.status, 0, run.stderr);
  const parsed = JSON.parse(run.stdout);
  assert.equal(parsed.status, "pass");
  assert.equal(parsed.cases[0].id, "mini-snipara-bootstrap");
});
