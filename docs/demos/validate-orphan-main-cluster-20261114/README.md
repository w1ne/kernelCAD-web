# Assembly validate: main mechanism with a standalone first part

`demo.mp4` is a 12-second text replay of recorded `kernelcad validate` output
for `examples/exploded/clamshell-table-first.kcad.ts`. The model declares an
unmated `table` before a `base`/`lid` hinge pair.

- `before.json`: output on `origin/develop` `cd3eac756`. The validator took the
  component of the first declared part as the main mechanism. It reported
  `assembly.part.floating` for `table` and `assembly.part.orphan` for `base`
  and `lid`, and the hint named the main mechanism as "contains 'table'".
- `after.json`: output on this branch. The largest connected component is the
  main mechanism; ties keep declaration order. Only `assembly.part.floating`
  for `table` remains. This is the same result as with `table` declared last.

The video is a text replay, not a KernelCAD renderer capture. Mechanism status
is **unverified**: `validate` ran without `--include-interference`. This is not
a simulation, deployed Studio capture, or hardware acceptance result.

## Reproduce

```sh
npx tsx src/agent/cli/index.ts validate examples/exploded/clamshell-table-first.kcad.ts --json
npx vitest run src/modeling/mates/validator.test.ts
node docs/demos/validate-orphan-main-cluster-20261114/make-video.mjs
```

`make-video.mjs` reads `before.json` and `after.json`, writes the slides to a
temporary directory, and regenerates `demo.mp4`, `poster.png` and
`video-evidence.json` (hashes and media probe results).

## Regression evidence

`src/modeling/mates/validator.test.ts`, cases "does not call a mated cluster
orphan when an unmated part is declared first" and "names the larger cluster as
the main mechanism when a smaller one is declared first". Both fail with the
`validator.ts` change reverted and pass with it (28/28 in the file).
