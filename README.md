# snipara-evals

**Project Intelligence evals for AI coding agents.**

`snipara-evals` is a small open-source scoring harness for questions most agent
evals still miss:

- did the agent preserve the project context it was given?
- did it respect decisions and avoid rejected directions?
- did it understand the impact surface of the change?
- did it run or report the expected verification?
- did it preserve enough continuity for another agent to resume the work?

It is deterministic by default and does not require an LLM judge. You describe a
case in JSON, pass in the observed agent output, and get a scorecard that can run
locally or in CI.

## Why This Exists

Most coding-agent evals ask whether the final answer is correct. That is useful,
but not enough for real projects. Agents also need to carry project decisions,
blast radius, verification plans, and handoff context across a task.

This repo is part of the open "Mini Snipara" stack:

| Repo | Role |
| --- | --- |
| [`snipara-companion`](https://github.com/Snipara/snipara-companion) | Workflow continuity for AI coding agents |
| [`snipara-memory`](https://github.com/Snipara/snipara-memory) | Local durable project memory |
| [`snipara-evals`](https://github.com/Snipara/snipara-evals) | Project Intelligence scoring |

Hosted Snipara remains the managed layer for source authority, reviewed memory,
team sync, code graph impact, dashboards, and operations.

## Quick Start

```bash
npx snipara-evals run examples/project-intelligence-case.json
```

JSON output:

```bash
npx snipara-evals run examples/project-intelligence-case.json --json
```

Fail CI when thresholds are missed:

```bash
npx snipara-evals run examples/project-intelligence-case.json --fail-on-threshold
```

## Case Format

```json
{
  "id": "agent-handoff-example",
  "expected": {
    "context": [
      {
        "id": "license",
        "text": "The public repository uses Apache-2.0.",
        "keywords": ["Apache-2.0", "public repository"]
      }
    ],
    "decisions": [
      {
        "id": "hosted-code-graph",
        "statement": "Code graph remains hosted.",
        "keywords": ["code graph", "hosted"],
        "rejectedKeywords": ["open source code graph"]
      }
    ],
    "impact": [
      {
        "id": "cli-surface",
        "target": "CLI command surface",
        "keywords": ["CLI", "command"],
        "files": ["src/cli.ts"]
      }
    ],
    "verification": [
      {
        "id": "test-suite",
        "check": "Run the package tests.",
        "command": "pnpm test",
        "keywords": ["tests pass"]
      }
    ],
    "continuity": [
      {
        "id": "handoff",
        "handoff": "Leave a concise next-step handoff.",
        "keywords": ["handoff", "next step"]
      }
    ]
  },
  "observed": {
    "answer": "Implemented the CLI in src/cli.ts, kept code graph hosted, and ran pnpm test. Handoff: next step is release packaging.",
    "filesChanged": ["src/cli.ts"],
    "commandsRun": ["pnpm test"]
  }
}
```

## Metrics

`snipara-evals` reports five metric scores from 0 to 100.

| Metric | What it checks |
| --- | --- |
| Context Preservation | Required facts, constraints, and source details were carried into the result |
| Decision Consistency | Canonical decisions were followed and rejected directions were avoided |
| Impact Awareness | Files, commands, dependencies, risks, or affected surfaces were acknowledged |
| Verification Coverage | Expected checks were run, mentioned, or marked with status |
| Continuity | Handoff, resume point, blockers, and next action are visible |

The scoring rules are intentionally simple and public. This repo is not a dump
of Snipara's internal benchmark fixtures, tuning notes, or private rubrics.

## Library Usage

```ts
import { evaluateCase } from "snipara-evals";

const result = evaluateCase({
  id: "demo",
  expected: {
    context: [{ id: "fact", text: "The package is Apache-2.0 licensed." }],
  },
  observed: {
    answer: "The package is Apache-2.0 licensed.",
  },
});

console.log(result.overall.score);
```

## Development

```bash
pnpm install
pnpm build
pnpm type-check
pnpm lint
pnpm test
pnpm pack:smoke
```

## Open Source Boundary

Good public contributions:

- deterministic scoring helpers
- portable JSON case formats
- CLI/reporting improvements
- sanitized examples
- adapters for public agent transcripts

Keep private:

- customer data
- private runbooks or deployment details
- internal benchmark datasets and raw reports
- proprietary ranking heuristics or hosted code graph internals
- secrets, `.env` files, screenshots, logs, and generated config dumps
