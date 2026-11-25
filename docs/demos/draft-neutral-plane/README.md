# Draft about a named neutral plane demo

[Watch the 9-second MP4](demo.mp4). The frames are generated from local OCCT
measurements, not from a deployed browser session.

## Result

`Shape.draft(angleDeg, { face, neutralPlane })` now uses the named planar
parting face exactly where the caller put it. Before, a `neutralPlane` that
differed from the drafted face was ignored: the lowerer derived a plane at the
body extent opposite the pull direction and only emitted
`feature.draft.neutral-plane-derived`.

On a 40 × 30 × 20 box with the front face drafted 10°:

- `neutralPlane: 'top'` keeps the top edge at y = 0, z = 20 and swings the
  bottom edge to y = −3.527 mm. The solid grows from 24 000 mm³ to
  25 410.616 mm³: +1 410.616 mm³, equal to 40 × ½ × 20 × 20·tan 10°.
- Omitting `neutralPlane` derives the bottom plane instead: the bottom edge
  stays at y = 0 and the top edge moves inward. The same 10° taper shrinks the
  solid to 22 589.384 mm³: −1 410.616 mm³.
- A face label resolves the same way: `faceLabels: { parting: 'top' }` and
  `neutralPlane: 'parting'` reproduce the 25 410.616 mm³ result.
- Both results are one valid solid. The default (no `neutralPlane`) is
  unchanged.

The named plane must resolve to a planar face on the base solid. An unknown
name or a curved face fails with `feature.invalid-args`, naming the requested
selector; a plane parallel to the drafted face fails with
`feature.draft.failed`. The lowerer no longer guesses a different parting line.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/draft-neutral-plane/capture.mts
npx vitest run tests/integration/modeling/draftNeutralPlane.test.ts \
  tests/unit/backends/occt/draft.test.ts --reporter=dot
```

The fixture is [`draft-neutral-plane.kcad.ts`](draft-neutral-plane.kcad.ts).
It drafts the front face of a 40 × 30 × 20 box about the named top plane.

[`behavior-removed-test.log`](behavior-removed-test.log) is the integration
test run against the previous `shellDraft.ts`: 5 of 6 cases fail. The named-top
case measures 22 589.384 mm³ instead of 25 410.616 mm³ and still emits
`feature.draft.neutral-plane-derived`; the unknown, non-planar and parallel
planes are accepted by the derived-plane fallback instead of being refused.
[`tests.log`](tests.log) is the passing run: 12 tests in 2 files.

## MP4

The three 1280 × 720 PNG frames were encoded with:

```sh
ffmpeg -y -framerate 1/3 -start_number 1 \
  -i docs/demos/draft-neutral-plane/frames/frame-%02d.png \
  -vf 'fps=24,format=yuv420p' -t 9 -an \
  -c:v libx264 -profile:v high -crf 19 -movflags +faststart \
  docs/demos/draft-neutral-plane/demo.mp4
```

`ffprobe` reports H.264, 1280 × 720, `yuv420p`, 24 fps, 9 seconds. The encoded
frames were inspected. The video shows the vertical front face before the
draft, the named-top result with the fixed top edge, and the named-top and
derived-plane results side by side.

This bundle records local model validation only. It makes no deployed-behavior,
simulation or hardware-acceptance claim.
