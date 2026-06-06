# Contributing

Thanks for improving `snipara-evals`.

## Local Setup

```bash
pnpm install
pnpm build
pnpm type-check
pnpm lint
pnpm test
pnpm pack:smoke
```

## Scope

Good contributions:

- deterministic scoring improvements
- CLI and report formatting
- public JSON case examples
- transcript adapters
- docs that help users run evals in CI

Out of scope for this public repo:

- customer data
- internal Snipara benchmark fixtures or raw reports
- private ranking heuristics
- hosted code graph internals
- secrets, logs, `.env` files, screenshots, or generated config dumps

## Pull Requests

Keep PRs focused and include a short explanation of the behavior being scored.
If a scoring change affects thresholds or output shape, update tests and the
README example.
