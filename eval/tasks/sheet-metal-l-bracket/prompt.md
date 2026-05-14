# Sheet-metal L-bracket

Build a single-bend L-bracket from a 2 mm steel sheet.

- Flat blank: 100 mm x 60 mm rectangle.
- One 90 degree bend, folding up (toward +Z) at x = 50 mm along the long axis.
- Inner bend radius: 3 mm.
- Use K-factor 0.38 (typical mild steel of this thickness).

Return the bent Shape.

## Hints

- `sheetMetal(profile, { thickness, kFactor })` builds the flat body from a closed sketch.
- `.bend(edgeRef, angle, radius)` adds a fold along a linear bend axis. Slice-1 selector shorthand: `{ atX: 50 }` defines the bend axis at x = 50 along the Y direction.
- K-factor bend allowance: BA = (pi * |angle| / 180) * (kFactor * thickness + radius).
