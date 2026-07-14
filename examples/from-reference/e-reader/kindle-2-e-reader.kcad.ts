// Real Object Brief
// Artifact: neutral front-facing e-reader benchmark — a four-part parametric
//   consumer-device reconstruction informed by the supplied Kindle 2 photo.
// Reference: ./kindle-2-reference.jpg (front-facing public-domain photograph).
// Scale: millimetres. Defensible category estimate: exterior approximately
//   134 mm wide x 203 mm high x 9.1 mm thick (Kindle 2 class); all dimensions
//   and internals are inferred from the photo/category and are not a
//   manufacturing claim.
// Visible facts (from reference photo):
//   - The front is a tall, pale rounded-rectangle enclosure with a much larger
//     height than width and a shallow case depth.
//   - A dark, inset e-paper display occupies the upper central front face,
//     leaving a consistent surrounding bezel.
//   - The photographed product also visibly has page controls, a keyboard,
//     brand text, and a square navigation cluster; those trade-dress-specific
//     interface details are intentionally abstracted out of this neutral,
//     four-part benchmark.
//   - The benchmark retains a recessed circular navigation control, a small
//     status LED, and a bottom USB-C-scale opening as generic device cues.
// Hidden-side inference:
//   - The unseen rear is inferred as a continuous shallow enclosure with a
//     battery/PCB volume, fastening features, and a small front recess behind
//     the display and controls; none are asserted as production internals.
// Validation focus:
//   - Front view: tall rounded silhouette, inset dark display, circular lower
//     control, and small status LED remain legible without the reference plane.
//   - Right and iso views: body reads as a real 9.1 mm enclosure rather than
//     a flat card, with display and controls recessed inside the front face.
//   - Bottom view: the USB-C-scale opening crosses the housing bottom face.
//   - Assembly gate: exactly four named parts have modest clearances and zero
//     interference pairs.

const bodyWidth = param('bodyWidth', 134, {
  min: 120,
  max: 150,
  description: 'inferred exterior width in mm',
});
const bodyHeight = param('bodyHeight', 203, {
  min: 185,
  max: 220,
  description: 'inferred exterior height in mm',
});
const bodyThickness = param('bodyThickness', 9.1, {
  min: 7,
  max: 13,
  description: 'inferred enclosure thickness in mm',
});
const cornerRadius = param('cornerRadius', 11, {
  min: 6,
  max: 18,
  description: 'front-outline corner radius in mm',
});
const bezelWidth = param('bezelWidth', 14, {
  min: 8,
  max: 24,
  description: 'nominal front display bezel in mm',
});
const screenWidth = param('screenWidth', 94, {
  min: 76,
  max: 106,
  description: 'visible display width in mm',
});
const screenHeight = param('screenHeight', 125, {
  min: 104,
  max: 145,
  description: 'visible display height in mm',
});
const screenRecess = param('screenRecess', 0.9, {
  min: 0.45,
  max: 1.8,
  description: 'front display and control recess depth in mm',
});
const controlDiameter = param('controlDiameter', 19, {
  min: 13,
  max: 26,
  description: 'recessed circular navigation-control diameter in mm',
});
const usbPortWidth = param('usbPortWidth', 10, {
  min: 7,
  max: 14,
  description: 'bottom USB-C opening width in mm',
});
const usbPortHeight = param('usbPortHeight', 4, {
  min: 2.5,
  max: 6,
  description: 'bottom USB-C opening height in mm',
});

// Virtual visual aid only: the positive Y offset places the photo behind the
// front face, and scoring hides it so it cannot affect the resulting geometry.
referenceImage('./kindle-2-reference.jpg', {
  plane: { plane: 'xz', offset: 8 },
  anchor: 'origin',
  scale: 'fit-bbox',
  opacity: 0.24,
});

const HOUSING_MATERIAL = {
  baseColor: '#e9e7e1',
  metalness: 0,
  roughness: 0.42,
  clearcoat: 0.16,
  clearcoatRoughness: 0.22,
};
const DISPLAY_MATERIAL = {
  baseColor: '#252a2b',
  metalness: 0,
  roughness: 0.31,
  clearcoat: 0.18,
  clearcoatRoughness: 0.2,
};
const CONTROL_MATERIAL = {
  baseColor: '#c9c7c0',
  metalness: 0,
  roughness: 0.5,
  clearcoat: 0.12,
  clearcoatRoughness: 0.3,
};
const LED_MATERIAL = {
  baseColor: '#c96a45',
  metalness: 0,
  roughness: 0.18,
  clearcoat: 0.55,
  clearcoatRoughness: 0.1,
};

const frontY = bodyThickness.divide(2).negate();
const bottomZ = bodyHeight.divide(2).negate();
const screenCenterZ = bodyHeight.divide(2)
  .subtract(bezelWidth)
  .subtract(screenHeight.divide(2));
const navigationCenterZ = screenCenterZ
  .subtract(screenHeight.divide(2))
  .subtract(bezelWidth)
  .subtract(controlDiameter.divide(2));
const ledCenterZ = navigationCenterZ
  .subtract(controlDiameter.divide(2))
  .subtract(bezelWidth.divide(2));

// The rounded XZ extrusion is centred after rotation; its PBR material is on
// the leaf before every sequential boolean below.
const housingLeaf = extrudeRoundedRect(bodyWidth, bodyHeight, cornerRadius, bodyThickness)
  .material(HOUSING_MATERIAL)
  .rotateX(-90)
  .translate(
    0,
    bodyThickness.divide(2).negate(),
    0,
  );

const displayPocket = extrudeRoundedRect(
  screenWidth.add(0.8),
  screenHeight.add(0.8),
  2.8,
  screenRecess.add(0.8),
)
  .rotateX(-90)
  .translate(0, frontY.subtract(0.4), screenCenterZ);

const navigationPocket = cylinder(
  screenRecess.add(1),
  controlDiameter.divide(2).add(0.55),
  64,
)
  .alongAxis([0, 1, 0])
  .translate(0, frontY.subtract(0.35), navigationCenterZ);

const ledPocket = cylinder(screenRecess.add(1), 1.65, 32)
  .alongAxis([0, 1, 0])
  .translate(0, frontY.subtract(0.35), ledCenterZ);

// This cutter deliberately extends past the bottom/front/back faces, making
// the port opening unambiguous rather than relying on coincident geometry.
const usbPortCutter = box(
  usbPortWidth,
  bodyThickness.add(1),
  usbPortHeight.add(1),
  true,
).translate(
  0,
  0,
  bottomZ.add(usbPortHeight.add(1).divide(2).subtract(0.2)),
);

let housing = housingLeaf.subtract(displayPocket);
housing = housing.subtract(navigationPocket);
housing = housing.subtract(ledPocket);
housing = housing.subtract(usbPortCutter);

const display = extrudeRoundedRect(
  screenWidth,
  screenHeight,
  2.3,
  screenRecess.multiply(0.45),
)
  .material(DISPLAY_MATERIAL)
  .rotateX(-90)
  .translate(0, frontY.add(screenRecess.multiply(0.5)), screenCenterZ);

const navigationControl = cylinder(
  screenRecess.multiply(0.42),
  controlDiameter.divide(2),
  64,
)
  .material(CONTROL_MATERIAL)
  .alongAxis([0, 1, 0])
  .translate(0, frontY.add(0.58), navigationCenterZ);

const statusLed = cylinder(screenRecess.multiply(0.28), 1.15, 32)
  .material(LED_MATERIAL)
  .alongAxis([0, 1, 0])
  .translate(0, frontY.add(0.64), ledCenterZ);

const reader = assembly('photo-reference-e-reader');
// These are static retention-frame mates: they document that each inset is
// installed in the housing while leaving the authored clearances unchanged.
// Their numeric origins are the default-param local frame centres.
reader.part('housing', housing)
  .connector('display-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.8975, 25] },
  })
  .connector('navigation-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.781, -61] },
  })
  .connector('led-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.784, -77.5] },
  });
reader.part('display', display)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.8975, 25] },
  });
reader.part('navigation-control', navigationControl)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.781, -61] },
  });
reader.part('status-led', statusLed)
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -3.784, -77.5] },
  });

reader.mate('display-retained', 'housing.display-seat', 'display.mount', 'fastened');
reader.mate('navigation-retained', 'housing.navigation-seat', 'navigation-control.mount', 'fastened');
reader.mate('led-retained', 'housing.led-seat', 'status-led.mount', 'fastened');

return reader.model();
