# Native catalogue source token profile

Measured 2026-11-05 with `o200k_base` using the pinned `js-tiktoken@1.0.21` implementation (MIT). The script counts each checked-in catalogue source file as one asset. A `.kcad.ts` asset may describe several named solids, so “asset” here does not mean one B-rep solid.

## Method

The census includes every regular `catalog/kits/**/*.kcad.ts` source file, sorted by repository-relative path. Files larger than 1,000,000 bytes are excluded and listed separately. The source tree used for this run was `8d868293535a9152ad46e4d18dd6c8486b9f5823`.

For each file the script reports:

- **With metadata:** tokenizes the exact UTF-8 source, including its `meta({...})` statement and comments.
- **Without metadata:** removes the one top-level `meta({...})` statement using the TypeScript AST, then tokenizes the remaining source with comments retained.
- **Program only:** also removes TypeScript comments while preserving line breaks and spacing. This is the code-only view for comparisons that exclude comments.

The published catalogue profile shows both user-facing source size and the code-only view. The sample manifest contains every included path, byte length, SHA-256, source commit, and any excluded large files.

## Results

| Source view | n | Min | Median | Mean | Max | p90 |
|---|---:|---:|---:|---:|---:|---:|
| With `meta({...})` | 2,100 | 207 | 635 | 781.14 | 3,183 | 1,304 |
| Without `meta({...})` | 2,100 | 95 | 491 | 640.79 | 2,998 | 1,157 |
| Program only: no metadata or comments | 2,100 | 95 | 468.5 | 606.62 | 2,959 | 1,078 |

Percentiles use nearest rank (`ceil(0.90 × n)`). Even-sized medians are the arithmetic mean of the two central values.

The reported 6,531,601-byte outlier was not present in this checkout: there were zero `.kcad.ts` files over the exclusion threshold. The largest source found was `catalog/kits/characters/knight-figure.kcad.ts` at 8,313 bytes. The outlier therefore could not be named or excluded by path in this run; see the recorded output and manifest.

Three native examples from the same census are useful when reviewing compact mechanical parts:

| Catalogue source | Bytes | With metadata | Without metadata | Program only |
|---|---:|---:|---:|---:|
| `catalog/kits/standard-components/angle-bracket.kcad.ts` | 1,549 | 539 | 422 | 422 |
| `catalog/kits/standard-components/gusset-bracket.kcad.ts` | 1,234 | 410 | 284 | 284 |
| `catalog/kits/standard-components/base-mounting-plate.kcad.ts` | 1,239 | 397 | 275 | 275 |

## Reproduce

```bash
npm install
npm run benchmark:tokens -- \
  --write-manifest=docs/benchmarks/token-efficiency/sample-manifest.json \
  --focus=catalog/kits/standard-components/angle-bracket.kcad.ts \
  --focus=catalog/kits/standard-components/gusset-bracket.kcad.ts \
  --focus=catalog/kits/standard-components/base-mounting-plate.kcad.ts
npx vitest run tests/unit/scripts/tokenBenchmark.test.ts
```

The test pins `o200k_base` and `js-tiktoken@1.0.21`, checks that metadata contributes to the full-source count, and verifies metadata removal and code-only comment handling.

The exact script output is retained in [output.json](./output.json), and the full path list with source hashes is in [sample-manifest.json](./sample-manifest.json). The short demo shows the actual measurement command and its native catalogue result: [MP4 demo bundle](../../demos/token-benchmark/README.md).
