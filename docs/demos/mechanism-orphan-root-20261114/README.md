# Mechanism truth: orphan-part root with a standalone first part

`demo.mp4` is a 12-second text replay of recorded strict `kernelcad render`
output for `examples/exploded/clamshell-table-first.kcad.ts`. The model declares
an unlinked `table` before a `base`/`lid` hinge pair.

- `before.txt`: output on `origin/develop` `cd3eac756`. The orphan walk started
  at the first declared part. It reported `mechanism.orphan-part` for `base`
  and `lid` ("Root 'table' reaches only ['table']"). No diagnostic named
  `table`, the part that has no mate.
- `after.txt`: output on this branch. The walk starts in the largest connected
  component; ties keep declaration order. It reports one
  `mechanism.orphan-part`, for `table` ("Root 'base' reaches only
  ['base', 'lid']"). This is the same result as with `table` declared last.

The video is a text replay, not a KernelCAD renderer capture. The mechanism is
**broken** in both runs (exit code 2): the fixture also has two
`mechanism.interpenetration` failures and one `mechanism.dof-mismatch` failure.
This change does not touch them. This is not a simulation, deployed Studio
capture, or hardware acceptance result.

## Reproduce

```sh
KERNELCAD_RENDER_STRICT=1 npx tsx src/agent/cli/index.ts render \
  examples/exploded/clamshell-table-first.kcad.ts --out /tmp/clamshell.png
npx vitest run src/modeling/runtime/mechanismOrphan.test.ts
node docs/demos/mechanism-orphan-root-20261114/make-video.mjs
```

`make-video.mjs` reads `before.txt` and `after.txt`, writes the slides to a
temporary directory, and regenerates `demo.mp4`, `poster.png` and
`video-evidence.json` (hashes and media probe results).

## Regression evidence

`src/modeling/runtime/mechanismOrphan.test.ts`, cases "an unlinked part declared
FIRST is the orphan, not the mated mechanism after it" and "a smaller cluster
declared first is the orphan cluster". Both fail with the `mechanismOrphan.ts`
change reverted and pass with it (5/5 in the file).
