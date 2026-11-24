# SVG import: a unitless width is CSS pixels, not an absent size

`lib.fromSVG` read `width="192px"` as 192 CSS pixels but read `width="192"`
as if no width were declared. Both spellings mean 192 px in SVG, so a viewBox
was mapped into the wrong physical size: the same file imported **twice as
small** with the unitless spelling. This bundle measures the same bytes with
the `origin/develop` reader and with the fixed reader.

The fixture declares `width="192" height="192" viewBox="0 0 96 96"`, so one
user unit is **2 CSS px = 0.529 mm**. A 84 x 84 unit square must import
**44.45 mm** wide. The old reader fell back to 1 user unit = 1 px and produced
**22.23 mm**.

## Result

| | before (`origin/develop` 964fa6cfe) | after (this branch) |
|---|---|---|
| unit decision | `assumed 1 user unit = 1 CSS px; no physically-dimensioned width` | `width='192' and height='192' over viewBox 96 x 96, xMidYMid meet` |
| mm per user unit | 0.264583 | 0.529167 |
| imported bbox | 1.59..23.81 mm (22.23 mm) | 3.18..47.63 mm (44.45 mm) |
| square area | 493.95 mm² | 1975.80 mm² |
| circle area | 148.67 mm² | 594.68 mm² |

Both readers agree with `width="192px"`: the explicit-px form already imported
at 44.45 mm on `origin/develop`. The fix makes the two equivalent spellings
agree.

## Placement rules after the fix

- `width` and `height` both declared (absolute unit or unitless CSS pixels):
  uniform `meet` or `slice` scale from the limiting axis, with `xMin`/`xMid`/
  `xMax` and `YMin`/`YMid`/`YMax` alignment, or independent axes for
  `preserveAspectRatio="none"`.
- `width` alone: uniform scale from the width.
- No `width`: 1 user unit = 1 CSS pixel, unchanged.
- A percentage `width` is still refused; a percentage `height` falls back to
  the width-only scale.

## Files

- `fixture.svg`: the input, unchanged between the two measurements.
- `measure.mjs`: imports the fixture with the reader at a given module path
  and prints the unit decision, bounding box and areas as JSON.
- `render.mjs`: draws `before.svg` / `after.svg` / `poster.svg` from
  `verification.json`, then writes `demo.mp4` (before, crossfade, after).
- `verification.json`: measured before/after numbers, test command, limits.
- `demo.mp4`, `poster.png`: the visual result.

## Reproduce

```sh
npx tsx docs/demos/svg-unitless-viewport/measure.mjs
npx tsx docs/demos/svg-unitless-viewport/measure.mjs /path/to/develop/src/kernel/import/importSvg.ts
node docs/demos/svg-unitless-viewport/render.mjs
npx vitest run src/kernel/import/importSvg.test.ts
```

The panel measures are local parser and geometry results. They do not claim
deployed-server or browser behavior. The before panel measures the same bytes
with the `origin/develop` reader; it is not a screenshot from another program.
