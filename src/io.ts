import { readFile } from "node:fs/promises";
import { type EvalCase } from "./types.js";

export async function loadCases(path: string): Promise<EvalCase[]> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (isCaseArrayWrapper(parsed)) {
    return parsed.cases;
  }

  if (isEvalCase(parsed)) {
    return [parsed];
  }

  throw new Error(`File ${path} must contain an eval case or an object with a cases array.`);
}

function isCaseArrayWrapper(value: unknown): value is { cases: EvalCase[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { cases?: unknown }).cases) &&
    (value as { cases: unknown[] }).cases.every(isEvalCase)
  );
}

function isEvalCase(value: unknown): value is EvalCase {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { id?: unknown }).id === "string"
  );
}
