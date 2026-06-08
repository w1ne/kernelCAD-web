// Animation-pose collision fixture (agent-animation workstream, T5).
//
// Minimal variant of revolute-sweep.kcad.ts whose arm DOES sweep through a
// tall post mid-travel — a deliberate collision at the ~45° mid-pose that
// does NOT exist at either keyed pose:
//
//   - base plate (grounded) with a tall post unioned in at 45° bearing,
//     20 mm out from the pivot, spanning z 8..28 (the arm rides z 12..18);
//   - arm bar on a REVOLUTE mate driven by param('armDeg'), swinging
//     0° → 90° linearly over 1000 ms.
//
// At armDeg=0 (rest/build pose) the arm lies along +x (y ∈ [-4, 4]) and the
// post sits at y ≈ [10, 18] — clear, so the BUILD is clean and the mechanism
// rests interference-free. At armDeg=90 the arm lies along +y and the post's
// x band is clear too. Only mid-travel (~45°, the keyframe-midpoint sample
// at tMs=500) does the arm pass straight through the post — several hundred
// mm³ of shared volume, far above the mechanism gate's noise threshold.

// ── Params ───────────────────────────────────────────────────────────────────
const armDeg = param('armDeg', 0, {
  min: 0, max: 90, description: 'Arm swing about the vertical pivot (deg)',
});

// Declared before the geometry (gearfinity convention) so the chain tail
// stays the solvedModel record, which lowers to a shape.
animationView({
  name: 'colliding sweep',
  fps: 12,
  tracks: [
    {
      param: 'armDeg',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 1000, value: 90 },
      ],
    },
  ],
});

// ── Parts (primitive-simple) ─────────────────────────────────────────────────
// Post center 20 mm from the pivot at a 45° bearing (14.14, 14.14), tall
// enough (z 8..28) to fully straddle the arm's z 12..18 sweep plane.
const post = box(8, 8, 20, true).translate(14.14, 14.14, 18);
const base = box(60, 40, 10, true).translate(0, 0, 5).union(post).color('plate');
const arm = box(40, 8, 6, true).translate(18, 0, 3).color('gear');

// ── Assembly ─────────────────────────────────────────────────────────────────
const asm = assembly('colliding-sweep');

const basePart = asm.part('base', base);
// 2 mm above the base plate top — the arm clears the PLATE everywhere; only
// the post blocks the mid-travel poses.
basePart.connector('armAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 12] }, axis: [0, 0, 1] });

const armPart = asm.part('arm', arm);
armPart.connector('hub', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

asm.mate('arm-pivot', 'base.armAxis', 'arm.hub', 'revolute', { pose: armDeg, limitsDeg: [0, 90] });

return asm.solvedModel({});
