# Vendored anti-slop Oxlint plugin

## Source

- Copied from the local `install-anti-slop` skill bundle (`assets/anti-slop/`) on 2026-10-03.
- Upstream repository and commit: **unknown**. The skill bundle is not a Git checkout and does not record its origin.
- Bundle digest: `69fa217ad6262822167aeaa4b4cf9d10bddbba0bd9fcb7f83e1807f3707bdca3` (SHA-256 of the sorted per-file SHA-256 list of all 38 files, computed from this directory with `find . -type f | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256`, excluding this file). The digest identifies the copied bytes but cannot reconstruct them.
- `vendor/eslint-stylistic/` keeps its own `LICENSE` and `UPSTREAM.md` (ESLint Stylistic, commit `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`).

## Installed paths

- Generic plugin: `tools/oxlint/anti-slop/index.ts`, registered as `anti-slop` in `.oxlintrc.json`.
- Effect plugin: `tools/oxlint/anti-slop/effect/index.ts` is copied but not registered, because this repository does not depend on `effect`.

## Dependencies

- `oxlint` and `@oxlint/plugins`, both pinned to `1.86.0`. Upgrade them together.

## Local deviations

None. The copy is byte-identical to the bundle.
