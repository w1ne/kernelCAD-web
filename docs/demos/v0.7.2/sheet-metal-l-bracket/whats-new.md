# Sheet metal L-bracket — slice 1

## Hero artifact

A 60 x 100 x 2 mm steel sheet folded into an L-bracket along its midline at 90 degrees, inner radius 3 mm, K-factor 0.38. The same workflow handles U-channels via two parallel bends.

## Why memorable

- This is the first kernelCAD release where a single agent call (`sheetMetal(s, opts).bend(...)`) produces a folded sheet-metal solid — no boolean union of pre-shaped boxes, no manual extrude + rotate gymnastics.
- The K-factor bend-allowance math is exposed verbatim in SKILL.md and `inspect({ of: 'bend-table' })`; agents can reason about flat-blank size before lowering.
- `.flattenPattern()` recovers the original sketch outline within float tolerance, usable directly for laser/CNC consumption.

## What's new

- `sheetMetal(profile, { thickness, kFactor })` top-level builder
- `Shape.bend(edgeRef, angle, radius)` Shape method
- `Shape.flattenPattern() -> Region` derived view
- `Region` type (new 2D outline + bend-line metadata)
- 3 new diagnostic codes (30 -> 33)
- 2 new MCP tools (`flatten_pattern`, `inspect({ of: 'bend-table' })`)
- 3 corpus tasks (`sheet-metal-l-bracket`, `sheet-metal-u-channel`, `sheet-metal-flatten-roundtrip`)
