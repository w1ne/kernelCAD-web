// Geometry-animating animationView fixture (Studio bake guard, B1).
//
// Unlike revolute-sweep / colliding-sweep (whose track param drives a MATE
// POSE — only per-part world transforms change), this timeline's track param
// drives a part DIMENSION (the arm's length). Solving a frame re-lowers the
// arm's LOCAL geometry, not just the solvedAssembly transform.
//
// Studio baked playback only re-applies rigid per-part world transforms — it
// never re-meshes — so it cannot represent this changing shape. The bake
// endpoint must REFUSE it with `animation.bake.geometry-param` (use offline
// `kernelcad animate` instead). Offline MP4 capture re-meshes every frame and
// renders it correctly.

// ── Params ───────────────────────────────────────────────────────────────────
// armLen feeds a box DIMENSION (geometry), NOT a mate pose.
const armLen = param('armLen', 20, {
  min: 20, max: 60, description: 'Arm bar length along +x (mm) — drives GEOMETRY',
});

// Declared before the geometry so the chain tail stays the solvedModel record.
animationView({
  name: 'geometry param sweep',
  fps: 12,
  tracks: [
    {
      param: 'armLen',
      keys: [
        { atMs: 0, value: 20 },
        { atMs: 1000, value: 60 },
      ],
    },
  ],
});

// ── Parts ─────────────────────────────────────────────────────────────────────
const base = box(60, 40, 10, true).translate(0, 0, 5).color('plate');
// armLen is a DIMENSION of the arm box — animating it re-lowers the arm's
// local geometry every frame.
const arm = box(armLen, 8, 6, true).translate(0, 0, 3).color('gear');

// ── Assembly ───────────────────────────────────────────────────────────────────
const asm = assembly('geometry-param-sweep');

const basePart = asm.part('base', base);
// 2 mm above the base plate top — the arm clears the plate everywhere.
basePart.connector('armAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 12] }, axis: [0, 0, 1] });

const armPart = asm.part('arm', arm);
armPart.connector('hub', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

// A revolute mate held at a CONSTANT pose (literal 0, not a param) — so the
// only animated param (armLen) drives part GEOMETRY, never a mate pose.
asm.mate('arm-pivot', 'base.armAxis', 'arm.hub', 'revolute', { pose: 0, limitsDeg: [0, 90] });

return asm.solvedModel({});
