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

// Engraving cutters begin outside the negative-Z exterior and end about
// 0.45 mm inside the dished center surface.
const legendCutStartZ = 0.4;
const legendCutHeight = 1.05;

const firstLine = sketch
  .text('MAKE NO', {
    size: 6.4,
    align: 'center',
    position: [0, 1.6],
  })
  .extrude(legendCutHeight)
  .reflect('yz')
  .translate(0, 0, legendCutStartZ);

const secondLine = sketch
  .text('MISTAKES', {
    size: 6.0,
    align: 'center',
    position: [0, -3.5],
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

// White inlays sit at the bottoms of the engraved grooves. Their exterior
// faces remain recessed below the spherical touch surface.
const inlayStartZ = 1.3;
const inlayHeight = 0.2;

const firstLineInlay = sketch
  .text('MAKE NO', {
    size: 6.4,
    align: 'center',
    position: [0, 1.6],
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
    position: [0, -3.5],
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
