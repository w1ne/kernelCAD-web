// examples/animation/revolute-sweep.kcad.ts
//
// Minimal two-joint animation demo: a revolute arm and a prismatic slider
// driven by a keyframe-track animationView() timeline. Use it to try the
// animation toolset end to end:
//
//   kernelcad animate examples/animation/revolute-sweep.kcad.ts out.mp4
//   (or open it in Studio and use the Animation tab to scrub/play)
//
// MINIMAL mechanism-clean assembly built to exercise the multi-track
// animation capture path end-to-end while staying primitive-simple so the
// build finishes in well under 5 s:
//
//   - base block (grounded), arm bar on a REVOLUTE mate driven by
//     param('armDeg'), slider block on a PRISMATIC mate driven by
//     param('slideMm') — two mates / two params so multi-track sampling is
//     exercised, not just the single-sweep degenerate case.
//   - animationView in keyframe-track form: the arm track exercises
//     easeInOut → hold → easeOut; the slider track runs on its own key grid.
//     fps 12 over 2000 ms → 24 scheduled frames.
//
// Geometry keeps air gaps everywhere (arm swings 2 mm above the base top,
// slider rides 5 mm beside the base) so no pose in the animated range can
// interfere — the fixture must evaluate clean and stay clean.

// ── Params ───────────────────────────────────────────────────────────────────
const armDeg = param('armDeg', 0, {
  min: 0, max: 120, description: 'Arm swing about the vertical pivot (deg)',
});
const slideMm = param('slideMm', 0, {
  min: 0, max: 20, description: 'Slider travel along +x (mm)',
});

// Declared before the geometry (gearfinity convention) so the chain tail
// stays the solvedModel record, which lowers to a shape.
animationView({
  name: 'revolute sweep',
  fps: 12,
  tracks: [
    {
      param: 'armDeg',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 800, value: 90, ease: 'easeInOut' },
        { atMs: 1200, value: 90 },               // hold
        { atMs: 2000, value: 0, ease: 'easeOut' },
      ],
    },
    {
      param: 'slideMm',
      keys: [
        { atMs: 0, value: 0 },
        { atMs: 1000, value: 20, ease: 'easeInOut' },
        { atMs: 2000, value: 0 },
      ],
    },
  ],
});

// ── Parts (primitive-simple) ─────────────────────────────────────────────────
const base = box(60, 40, 10, true).translate(0, 0, 5).color('plate');
const arm = box(40, 8, 6, true).translate(18, 0, 3).color('gear');
const slider = box(10, 10, 10, true).translate(0, 0, 5).color('#3b6ea5');

// ── Assembly ─────────────────────────────────────────────────────────────────
const asm = assembly('revolute-sweep');

const basePart = asm.part('base', base);
// 2 mm above the base top — the arm sweeps in free air.
basePart.connector('armAxis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 12] }, axis: [0, 0, 1] });
// 5 mm beside the base (-y) — the slider track never touches it.
basePart.connector('slideAxis', { type: 'axis', origin: { kind: 'vec3', value: [-20, -30, 0] }, axis: [1, 0, 0] });

const armPart = asm.part('arm', arm);
armPart.connector('hub', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [0, 0, 1] });

const sliderPart = asm.part('slider', slider);
sliderPart.connector('guide', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });

asm.mate('arm-pivot', 'base.armAxis', 'arm.hub', 'revolute', { pose: armDeg, limitsDeg: [0, 120] });
asm.mate('slide', 'base.slideAxis', 'slider.guide', 'prismatic', { pose: slideMm, limitsMm: [0, 20] });

return asm.solvedModel({});
