#!/usr/bin/env node
/**
 * CLI entry point for snipara-evals.
 *
 * Loads evaluation cases from JSON files, runs the scoring engine, and outputs
 * results in human-readable format or JSON. Supports fail-on-threshold mode
 * for CI/CD integration.
 *
 * Usage: snipara-evals run <casefile> [--json] [--fail-on-threshold]
 */
import { loadCases } from "./io.js";
import { formatSuite } from "./report.js";
import { evaluateSuite } from "./scoring.js";

type CliOptions = {
  json: boolean;
  failOnThreshold: boolean;
  files: string[];
};

async function main(argv: string[]): Promise<number> {
  const command = argv[2];

  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return 0;
  }

  if (command !== "run" && command !== "score") {
    console.error(`Unknown command: ${command}`);
    printHelp();
    return 1;
  }

  const options = parseOptions(argv.slice(3));
  if (options.files.length === 0) {
    console.error("Missing eval case file.");
    printHelp();
    return 1;
  }

  const cases = (await Promise.all(options.files.map((file) => loadCases(file)))).flat();
  const result = evaluateSuite(cases);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatSuite(result));
  }

  return options.failOnThreshold && result.status !== "pass" ? 1 : 0;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    failOnThreshold: false,
    files: [],
  };

  for (const arg of args) {
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--fail-on-threshold" || arg === "--strict") {
      options.failOnThreshold = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.files.push(arg);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`snipara-evals

Project Intelligence evals for AI coding agents.

Usage:
  snipara-evals run <case.json...> [--json] [--fail-on-threshold]
  snipara-evals score <case.json...> [--json] [--strict]

Commands:
  run, score              Evaluate one or more JSON case files

Options:
  --json                  Print machine-readable JSON
  --fail-on-threshold     Exit 1 when the suite fails thresholds
  --strict                Alias for --fail-on-threshold
  -h, --help              Show help
`);
}

main(process.argv)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
