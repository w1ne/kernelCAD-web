# Vision-driven analysis — the pop-art octagonal pocket-watch reference photo

Reference: `/tmp/royal-pop-reddit.png` (a Reddit screenshot of an official product photo).
Crops used for inspection:
- `/tmp/refcrop/watch.png` (1057×1057, the whole product card)
- `/tmp/refcrop/watch_close.png` (350×560, framed on the body)
- `/tmp/refcrop/watch_pendant.png` (350×280, the top pendant/bail/strap)
- `/tmp/refcrop/watch_dial.png` (350×280, the dial)

## What I see

The piece is a pocket-watch styled in pop-art / Royal-Oak aesthetic with a sculpted, integrated top. The composition reads **vertical** — the body is wider than tall by only a hair, but the pendant + strap on top doubles the overall height.

### Color palette (very narrow, on purpose)

| Region | Approx hex |
|---|---|
| Frame (octagonal outer body) | dusty rose / coral pink (~`#d96a72`) — saturated, slightly warm |
| Case (inner octagon under bezel) | mustard yellow (~`#e6c84a`) — warm, slightly desaturated |
| Dial | bright turquoise (~`#3fc7c4`) — almost mint, very saturated |
| Hands + markers + small text | yellow (~`#e6c84a`) — same as case |
| Subdial face | dusty pink (~`#d49ba0`) — paler than the frame |
| Subdial ring | same pink as frame |
| Strap | pink (frame match) with white contrast stitching down the centre |
| Screws | flat black hex heads |
| Subdial hand | thin red bar |
| AP-style monogram lower-left of dial | white/pink |

### Overall silhouette (body without strap)

- **Outer pink frame**: regular octagon, oriented "flat-top" (one flat edge horizontal at top and bottom). Outer flats appear ~33 mm tip-to-tip in real life (Swatch product specs cite a 44 mm diameter case but the visible body is narrower).
- **Inner yellow case**: a second octagon, slightly recessed, with flat-top orientation matching the frame. Inset is ~3-4 mm on each flat.
- **Eight visible hex screws** are seated at the *vertices* of the YELLOW case octagon (between the yellow case and the pink frame), one per corner. They're flat-black, hex-headed, set flush with the bezel.
- **Subdial** at roughly 4 o'clock (slightly above 3 o'clock and inset toward center). It's framed by a pink ring, has a white face, and carries a single red sub-second hand.
- **Three yellow numerals**: "12" top, "6" bottom, "9" left. The 3 position is replaced by the subdial.
- **Stick hour markers** at the remaining positions, yellow, simple rectangles.
- **Hands**: yellow hour and minute, blade shape, sub-second is red and thin.
- **Tapisserie waffle texture** on the dial — small raised pyramidal squares in a regular grid.

### TOP SECTION — the most important difference from prior attempts

This is what previous iterations failed at. Reading the photo carefully:

1. **NO bare "knob" pendant.** The top of the case widens into a sculpted *horn* that's the same pink as the frame. It rises above the top flat of the octagon, narrowing slightly as it goes up. It looks like a small fillet-blended trapezoidal nub, not a separate rectangular cube.
2. **Then a flat tab section.** Above the horn, the geometry transitions to a flatter, narrower oblong tab that's also pink — this is where the strap rivet would be visible in real life. The reference shows a slight "AP" stylized monogram embossed on it but that's beyond our authoring scope.
3. **Crown** — a small yellow knurled cylinder pokes out **from the right-hand side of the pink horn**, NOT from the top. It's roughly at the 1-2 o'clock direction in real life, **on the side** of the pendant. About 4-5 mm in body diameter. The reference shows it as a small yellow lozenge slightly behind/right of the pendant horn.
4. **Bail (lanyard ring)** — a slim pink ring with a clearly visible through-hole. Tube diameter ~1-1.5 mm, major ring diameter ~6 mm. It sits atop the flat tab section, axis aligned so the through-hole faces the camera (Y axis). The strap passes through this ring, folds, and double-stitches back.
5. **Strap** — wide, soft pink ribbon (~12-14 mm wide), with two contrast stitching lines down the middle. It folds at the bail and extends upward off-frame. In our render we should show a short stub (~25 mm tall above the bail) to evoke the strap.

### Dial inventory (visible through the glass)

- Turquoise plate with tapisserie waffle (small raised squares ~1 mm on a side, pitch ~1.4 mm).
- 8 stick markers (yellow), one at each hour minus the 3 position (subdial) and the 12/6/9 positions (numerals).
- 12 / 6 / 9 numerals in yellow, slab-serif, ~3-4 mm tall.
- Subdial: pink ring (~4 mm OD, ~3 mm ID), white face inside, red hand, at roughly the 3-4 o'clock dial location, center offset ~7 mm from dial center.
- Hour hand (~7 mm long, broad blade), minute hand (~10 mm long, slimmer). Both yellow, set to roughly 10:10 in the photo.
- Pinion cap in the center, yellow.
- A small "AP" emblem (or its kernelCAD equivalent — leave generic) bottom-left around 7-8 o'clock.

### Crystal

The reference photo doesn't show a strong dome highlight — likely a flat or nearly-flat sapphire. We'll target a *slight* dome with strong glass transmission so the dial reads through clearly. The previous build's dome was too tall and aggressive; the reference is much flatter.

## Build priorities (in order of weakness in prior attempts)

1. **Top section integration**: sculpted pink horn → flat tab → bail. NOT a bare crown sticking out of the case top with a Mickey-Mouse ring on top.
2. **Composition**: keep overall vertical extent modest so the iso-pose camera framing centers on the watch, not on a long ribbon.
3. **Crystal**: clearly arched but moderate; transmission ON, dial readable through it.
4. **Crown placement**: on the side of the pendant, not the top axis.
5. **Bail**: thin ring with through-hole facing the camera.
6. **Dial detail**: tapisserie + markers + numerals + subdial + hands.
7. **Strap**: short stub above the bail, single rectangle is fine.

## Geometry plan (mm)

- Frame: octagon, flat-to-flat 22 mm, Y depth 7 mm, fillet 0.6 mm.
- Case: octagon, flat-to-flat 17 mm, Y depth 6.5 mm.
- Dial: cylinder, radius 11 mm, depth 1.5 mm.
- Crystal: NURBS dome, footprint 11 mm radius, rise 1.2 mm (FLAT compared to prior), thickness 0.5 mm. Material: glass with transmission 0.95, ior 1.5, roughness 0.05.
- Pendant horn: a trapezoidal prism (trapezoid in XZ, extruded along Y). Base width = 8 mm (frame top edge), top width = 6 mm, height = 4 mm, depth = 5 mm. Heavily filleted at the case-junction.
- Pendant tab: another shorter trapezoidal prism on top of the horn. Base 6 mm, top 5 mm, height 3 mm, depth 4 mm.
- Bail: ring built via path() + revolve() (or via two arcs swept). Major radius 3 mm, tube radius 0.7 mm. Axis +Y so through-hole faces camera.
- Crown: small horizontal yellow hex prism (hex flat-to-flat 1.5 mm, length 2.5 mm) attached to the +X side of the pendant horn.
- Strap stub: pink rectangle 11 mm wide × 1.5 mm thick × 25 mm tall, with two white stitch lines authored as thin sub-extrusions.
