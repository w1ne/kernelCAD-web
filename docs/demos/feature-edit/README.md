# Edit a feature in place: `set_param` feature mode

A 60 × 40 × 5 mm bracket has one M8 clearance hole (`cylinder_1`, r = 4 mm,
a literal, not a `param()`). One call shrinks it to an M6 clearance hole:

```ts
set_param({ code, feature: 'cylinder_1', changes: { r: 3.3 } })
```

The tool finds the argument from the feature's recorded call site, rewrites
only that argument, checks the rewrite by capturing the script again, then
rebuilds the model before and after and returns the diff in the same result:

```diff
-const hole = cylinder(t + 2, 4).translate(30, 20, -1);
+const hole = cylinder(t + 2, 3.3).translate(30, 20, -1);
```

| | value |
| --- | --- |
| `edits` | `r: 4 → 3.3 mm`, argument `"4"` → `"3.3"`, line 5 |
| `changedParams` | `cylinder_1.r 4 → 3.3` (nothing else moved) |
| `geometry.summary` | 1 body resized, +82.2 mm³ added, 0 removed, max deviation 0.70 mm |
| builds / requirements | before ok (4 features) · after ok (4 features) |

The added volume matches the hand check: π × (4² − 3.3²) × 5 mm = 80.3 mm³,
plus the fillet on the hole edge. The maximum deviation is the 0.7 mm change in
hole radius.

View the [7.5-second demonstration](demo.mp4): before (iso and top), after, and
the returned diff. `before-top.png` and `after-top.png` are the top-view stills;
`diff.png` is the diff frame.

## Files

- `before.kcad.ts` — the input model (source of truth).
- `demo.ts` — the invocation; writes `after.kcad.ts` (the returned `new_code`)
  and `result.json` (the returned edits, changed parameters, geometry summary
  and build/requirements status).

## Reproduce

```sh
npx tsx docs/demos/feature-edit/demo.ts
```

The stills were meshed locally with this repository's kernel
(`meshFeaturesPerFeature` on `buildModel` of each file) and drawn with the
hosted service's software rasterizer, then composed into three 1280 × 720
frames and encoded with
`ffmpeg -framerate 1/2.5 -i frame-%d.png -vf "fps=24,format=yuv420p" demo.mp4`.

This is a local run of the tool. It does not show the hosted MCP service or a
printed part.
