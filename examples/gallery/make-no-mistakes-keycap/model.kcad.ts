// Purpose: add an editable, centered spherical finger dish to the original
// 2.0u Costar keycap while preserving its source geometry and coordinate frame.
// Source STEP bounds are centered on X/Y; its exterior touch face is at Z = 0.

const dishDepth = param('dishDepth', 1.0, {
  min: 0.4,
  max: 1.5,
  description: 'Maximum depth of the centered spherical top dish (mm)',
});

const outerTopZ = 0.0;
// The source is 37 × 18 mm. A sphere with this radius gives a 1 mm sag
// from the four footprint corners to the center:
// R = (halfDiagonal² + sag²) / (2 × sag) = 212.125 mm.
const dishRadius = 212.125;
const sphereCenterZ = dishDepth.add(outerTopZ - dishRadius);

const originalKeycap = await lib.fromSTEP('./2.0u_blank_costar.stp');
const sphericalDishCutter = sphere(dishRadius).translate(0, 0, sphereCenterZ);

// Single returned body: the imported keycap with its centered dish removed.
const dishedKeycap = originalKeycap.subtract(sphericalDishCutter);

// Top-shell stack (measured on the Costar blank):
//   exterior top Z = 0, inner cavity roof ≈ Z = 1.5 → 1.5 mm wall.
//   After the 1 mm center dish, only ≈ 0.5 mm of wall remains (Z 1.0..1.5).
// Engraving MUST end before the cavity roof or the legend punches through
// and is visible from the underside. Target: 0.3 mm into the dish at center,
// leaving ≈ 0.2 mm of closed shell under the letters.
const legendCutStartZ = 0.4;
const legendCutHeight = 0.9; // ends at Z = 1.3

// sketch.text Y is baseline-only (align is horizontal).
// Measured glyph boxes at baseline Y=0 (size 6.4 / 6.0):
//   MAKE NO   y ∈ [-0.0625,  4.46875]
//   MISTAKES  y ∈ [-0.0586,  4.18945]
// Keep 5.1 mm baseline gap; place the two-line block so its visual center
// is on Y=0 → equal margin to the ±9 mm key rims (~4.19 mm each).
const makeNoBaselineY = 0.345;
const mistakesBaselineY = -4.755;

const firstLine = sketch
  .text('MAKE NO', {
    size: 6.4,
    align: 'center',
    position: [0, makeNoBaselineY],
  })
  .extrude(legendCutHeight)
  .reflect('yz')
  .translate(0, 0, legendCutStartZ);

const secondLine = sketch
  .text('MISTAKES', {
    size: 6.0,
    align: 'center',
    position: [0, mistakesBaselineY],
  })
  .extrude(legendCutHeight)
  .reflect('yz')
  .translate(0, 0, legendCutStartZ);

const engravedKeycap = dishedKeycap
  .subtract(firstLine, secondLine)
  .material({
    baseColor: '#252830',
    metalness: 0,
    roughness: 0.42,
  });

// White inlays sit at the bottoms of the engraved grooves, fully inside the
// remaining top shell (must not extend past the cavity roof at Z ≈ 1.5).
const inlayStartZ = 1.1;
const inlayHeight = 0.2; // 1.1..1.3, nested in the groove

const firstLineInlay = sketch
  .text('MAKE NO', {
    size: 6.4,
    align: 'center',
    position: [0, makeNoBaselineY],
  })
  .extrude(inlayHeight)
  .reflect('yz')
  .translate(0, 0, inlayStartZ)
  .material({
    baseColor: '#ffffff',
    metalness: 0,
    roughness: 0.3,
  });

const secondLineInlay = sketch
  .text('MISTAKES', {
    size: 6.0,
    align: 'center',
    position: [0, mistakesBaselineY],
  })
  .extrude(inlayHeight)
  .reflect('yz')
  .translate(0, 0, inlayStartZ)
  .material({
    baseColor: '#ffffff',
    metalness: 0,
    roughness: 0.3,
  });

// Return the manufacturing body and both recessed inlays as named parts. This
// keeps the dark printable keycap body intact while making the white lettering
// visible in Studio, GLB, and multi-material 3MF workflows.
const finishedKeycap = assembly('MAKE NO MISTAKES 2.0u Costar keycap');
const keycapBodyPart = finishedKeycap.part('keycap-body', engravedKeycap);
const makeNoInlayPart = finishedKeycap.part('make-no-inlay', firstLineInlay);
const mistakesInlayPart = finishedKeycap.part('mistakes-inlay', secondLineInlay);

const fixedFrame = {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 0] },
};
keycapBodyPart
  .connector('make-no-seat', fixedFrame)
  .connector('mistakes-seat', fixedFrame);
makeNoInlayPart.connector('seat', fixedFrame);
mistakesInlayPart.connector('seat', fixedFrame);
finishedKeycap.mate(
  'make-no-fixed-inlay',
  'keycap-body.make-no-seat',
  'make-no-inlay.seat',
  'fastened',
);
finishedKeycap.mate(
  'mistakes-fixed-inlay',
  'keycap-body.mistakes-seat',
  'mistakes-inlay.seat',
  'fastened',
);

return finishedKeycap.model();
