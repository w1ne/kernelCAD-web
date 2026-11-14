# Mechanism banner: severity of each entry

`demo.mp4` is a 12-second text replay of recorded `kernelcad validate
--include-interference` output for
`examples/robot-arm/skill-built-supported-arm.kcad.ts`. Two free passive
joints of this example swing in the 0.5 s release check. The gate reports each
as `mechanism.drops-on-release` with severity `info` ("informational, not a
defect").

- `before.txt`: output on `origin/develop` `cd3eac756`. The banner prints the
  two notes as `[ERROR]` and counts them: "9 failures". The summary line
  below the banner counts 7 (first failure "+6 more").
- `after.txt`: output on this branch. The banner counts the 7 error-severity
  entries and prints the two notes as `[NOTE]` after the errors.

The video is a text replay, not a KernelCAD renderer capture. The mechanism is
**broken** in both runs (exit code 2). This change does not touch the verdict,
the exit code or the failures themselves. This is not a deployed Studio
capture or hardware acceptance result.

## Reproduce

```sh
npx tsx src/agent/cli/index.ts validate \
  examples/robot-arm/skill-built-supported-arm.kcad.ts --include-interference --epsilon 0.01
npx vitest run tests/unit/cli/renderHuman.test.ts tests/unit/mcp/renderPreviewTool.test.ts
node docs/demos/mechanism-banner-severity-20261114/make-video.mjs
```

`make-video.mjs` reads `before.txt` and `after.txt`, writes the slides to a
temporary directory, and regenerates `demo.mp4`, `poster.png` and
`video-evidence.json` (hashes and media probe results).

## Regression evidence

- `tests/unit/cli/renderHuman.test.ts`, case "counts only error-severity
  entries as failures and labels the rest by severity".
- `tests/unit/mcp/renderPreviewTool.test.ts`, case "keeps a non-fatal note out
  of mechanism_failure_codes".

Both fail with the change reverted and pass with it.
