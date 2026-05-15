# Sheet-metal flatten-pattern roundtrip

Build an L-bracket (same params as the L-bracket task: 100x60x2 mm, K-factor 0.38, 90 degree bend at x=50, inner radius 3 mm).

Then call `.flattenPattern()` on the bent body. The returned `Region` carries the unfolded outline + the bend line; the bounding box of `Region.outer` matches the original sketch within float tolerance.

Return the bent Shape (the harness inspects both the Shape and the recovered Region via the kernelcad API).

## Hints

- `Shape.flattenPattern()` walks the lineage chain back to the `sheetMetal` root and replays the K-factor neutral-axis length to recover the flat outline.
- The K-factor formula guarantees that for slice-1 single-/two-bend chains, the unfolded outline's bounding box matches the original sketch within float noise.
