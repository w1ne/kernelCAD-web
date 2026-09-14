// Real Object Brief
// Artifact: a square bracket plate reconstructed from a traced silhouette,
//   sized by an assumption-ledger-grounded scale.
//   Reference: ./reference-square.png.
// Ledger: ./bracket-from-trace.ledger.json (written + resolved by
//   run-ledger-example.ts; see README.md for the exact commands).
// Scale: millimetres. trace_from_image's opencv backend measured the
//   silhouette's normalized bbox as [0.3047, 0.3047] .. [0.6914, 0.6914] on
//   a 256x256px reference (visible fact, confidence 1). The `scale` fact was
//   `missing` (no scale anchor in the photo) until resolve_assumptions
//   overrode it with 0.1548 mm/px — the value this script's `plateSide`
//   param default is derived from (99.0px * 0.1548mm/px ≈ 15.33mm).
// Visible facts (from reference photo):
//   - A single square silhouette, centered, occupying the middle ~39% of
//     the frame on both axes.
// Hidden-side inference:
//   - None required — a flat plate has no hidden geometry beyond thickness,
//     which is not visible in a single top-down photo and is therefore an
//     explicit param default rather than a traced fact.
// Validation focus:
//   - Front/top view: the plate silhouette reads as a square, side length
//     matching the ledger-resolved scale within rounding.

const plateSide = param('plateSide', 15.33, {
  min: 5,
  max: 50,
  description: 'square plate side in mm, derived from the ledger-resolved scale (99.0px traced bbox width * 0.1548 mm/px)',
});
const plateThickness = param('plateThickness', 3, {
  min: 1,
  max: 10,
  description: 'plate thickness in mm — not visible in the top-down reference photo, an explicit assumption (not a ledger fact)',
});

return box(plateSide, plateSide, plateThickness);
