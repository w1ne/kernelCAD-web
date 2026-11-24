# SVG import: honour the physical viewport and preserveAspectRatio

`lib.fromSVG` scaled one user unit by `width / viewBox.width` and ignored the
declared `height`. A file whose viewport aspect differs from its viewBox
imported at the wrong size and position. `preserveAspectRatio` was ignored too.

The fixture declares a **200 x 100 mm** viewport and a square
`viewBox="0 0 100 100"` holding a 100 x 100 square and a Ø50 circle. SVG's
default `xMidYMid meet` must draw it as a **100 x 100 mm** square centred at
x = 50..150 mm. The old reader scaled by 2 mm per unit and put the square at
0..200 mm on both axes, so half the part fell below the viewport.

## Files

- `fixture.svg`: the input, unchanged between the two measurements.
- `measure.mjs`: imports `fixture.svg` with the reader at a given module path
  and prints the unit decision, bounding box and areas as JSON.
- `render.mjs`: draws `before.svg` / `after.svg` / `poster.svg` from
  `verification.json`, then writes `demo.mp4` (before, crossfade, after).
- `verification.json`: measured before/after numbers, test commands and
  counts, limits.
- `demo.mp4`, `poster.png`: the visual result.

## Reproduce

Measure the current branch and a checkout of `origin/develop` on identical
bytes:

```sh
npx tsx docs/demos/svg-viewport-aspect/measure.mjs
npx tsx docs/demos/svg-viewport-aspect/measure.mjs /path/to/develop/src/kernel/import/importSvg.ts
node docs/demos/svg-viewport-aspect/render.mjs
```

Narrow regression:

```sh
npx vitest run src/kernel/import/importSvg.test.ts
```

## Result

| | before (`develop` 4cfd06ca7) | after (this branch) |
|---|---|---|
| unit decision | `width='200mm' over viewBox width 100` | `width='200mm' and height='100mm' over viewBox 100 x 100, xMidYMid meet` |
| mm per user unit | 2 | 1 |
| imported bbox | 0..200 x 0..200 mm | 50..150 x 0..100 mm |
| square area | 40000 mm² | 10000 mm² |
| circle area | 7853.98 mm² | 1963.50 mm² |

The panel measures are local parser and geometry results. They do not claim
deployed-server or browser behavior. The before panel measures the same bytes
with the `origin/develop` reader; it is not a screenshot from another program.

## Placement rules after the fix

- `width` and `height` both physically dimensioned: uniform `meet` or `slice`
  scale from the limiting axis, with `xMin`/`xMid`/`xMax` and
  `YMin`/`YMid`/`YMax` alignment.
- `preserveAspectRatio="none"`: independent X and Y scales.
- Width alone (no physical height): the previous uniform width scale.
- No physical width: one user unit is one CSS pixel (1/96 in), unchanged.
- The importer still does not clip profiles; `slice` keeps geometry outside
  the declared viewport.
