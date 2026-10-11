# Drafting review example bundle

Two source models exercise actual hole, counterbore, fillet and chamfer geometry.
The mounting plate is exported in baseline, chain and symmetry styles; the
monolithic bearing mount demonstrates a real cut section and two saved nominal
depth label edits. The public tutorial is sourced from
`docs/guide/drafting-review.md`.

```bash
# Install from the lockfile once, then run these from the repository root:
npx tsx examples/drafting-review/run.ts
npm run site:build-blog
```

The first command rebuilds the named SVG/PDF/PNG outputs and their reports under
`site/blog/drafting-review/`. Pass another output directory to write an isolated
bundle. The shared blog command rebuilds the static article and index from the
guide, validates its image/video files, and copies the Studio demonstration
from `docs/demos/drafting-review/demo.mp4` into the post. It does not recompute
these drawing sheets. The recording's invocation, settings and local validation
evidence are retained in `docs/demos/drafting-review/`. Source downloads are
byte-identical copies of the two
`.kcad.ts` files. The manifest records source hashes and options. The bearing
review JSON records current annotation IDs, before/after labels and the reason
for restoring the source's nominal depths instead of displaying the B-rep's
0.01 mm cutter allowance.

Nominal mounting-plate geometry: 100 × 70 × 12 mm, R6 corners, 0.5 mm top chamfer,
4 × Ø9 at X12/88 and Y12/58, central Ø30 through bore. Bearing mount: 120 × 80 × 12
base, 56 × 36 × 54 connected pedestal, Ø32 throat, nominal Ø44 × 8 front seat,
4 × Ø9 through mounting holes with nominal Ø15 × 5 counterbores. Both parts use
declared underside/front/left datums. Tolerances are illustrative requirements;
automatic tolerance frames are proposals for review.

These are executable documentation examples. No bearing catalog fit, load
capacity, physical manufacture, manufacturing acceptance, or released drawing
is claimed. `EXAMPLE` is stamped as their drawing revision. Inspect the full SVG
and PDF before using the geometry as a starting point for a real design.
