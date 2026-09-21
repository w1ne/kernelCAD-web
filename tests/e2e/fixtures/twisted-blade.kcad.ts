// Twisted blade fixture — kernel end-to-end proof for loft section placement
// (Tasks 1-5: `planes[].rotationDeg` on NURBS sections).
//
// What it proves: five tapered NACA ribs, stacked along X on YZ planes and
// rotated 0°→40° about mid-chord, loft into one valid solid through the full
// CLI pipeline (capture → lower → OCCT → STEP).
//
// Verify:
//   node dist/cli/index.js evaluate tests/e2e/fixtures/twisted-blade.kcad.ts
//   node dist/cli/index.js export step tests/e2e/fixtures/twisted-blade.kcad.ts \
//     -o /tmp/opencode/turbine-probe/twisted-blade.step
//   node dist/cli/index.js inspect step /tmp/opencode/turbine-probe/twisted-blade.step
//
// Expected envelope (OCCT, v0.25.0, `inspect step` exact bbox): bbox
// [20..80] x [-9.7..9.9] x [-30.1..30] mm, volume ≈ 9191 mm³, 3 faces (one
// lateral face + two end caps). Drift beyond a few percent means the twist or
// the airfoil law changed — check the outline seam below before "cleaning it
// up".

// Standard closed-trailing-edge NACA 4-digit thickness law (`-0.1036` makes
// yt(1) = 0 exactly). `t` is the true thickness ratio: max thickness ≈ t·chord
// near s = 0.3, sharp TE.
function rib(chord: number, t: number) {
  const half = chord / 2;
  const upper: [number, number][] = [];
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    const x = -half + chord * s;
    const yt = 5 * t * chord * (
      0.2969 * Math.sqrt(s) - 0.1260 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4
    );
    upper.push([yt, x]);
  }
  // Lower surface is the mirrored upper surface, traversed TE → LE. `slice(1)`
  // drops the duplicated TE corner (`upper` already ends there), so the spline
  // chains head-to-tail: LE → upper → TE → lower → LE. The final point equals
  // the `moveTo` start, so `.close()` is a no-op edge (the lowerer skips the
  // closing line when the pen is already at the path start — do not add or
  // remove points here without re-checking both seams).
  const lower = [...upper].reverse().map(([yt, x]) => [-yt, x] as [number, number]);
  const outline = [...upper, ...lower.slice(1)];
  return path().moveTo(outline[0][0], outline[0][1]).spline(outline).close();
}

const sections = [0, 1, 2, 3, 4].map((i) => {
  const spanFraction = i / 4;
  return rib(60 - 30 * spanFraction, 0.12 - 0.04 * spanFraction);
});
const planes = [0, 1, 2, 3, 4].map((i) => {
  const spanFraction = i / 4;
  return {
    plane: 'YZ' as const,
    origin: [20 + i * 15, 0, 0] as [number, number, number],
    rotationDeg: 40 * spanFraction,
  };
});
const blade = sections[0].loft(sections.slice(1), { planes });
return blade;
