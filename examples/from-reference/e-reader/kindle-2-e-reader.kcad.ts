// Real Object Brief
// Artifact: neutral front-facing e-reader benchmark — a four-part parametric
//   consumer-device reconstruction informed by the supplied Kindle 2 photo.
// Reference: ./kindle-2-reference.jpg (front-facing public-domain photograph).
// Scale: millimetres. Amazon's Kindle User's Guide, 2nd Edition, lists model
//   D00701 at 203.2 mm high × 134.6 mm wide × 9.1 mm thick:
//   https://kindle.s3.amazonaws.com/Kindle%20User%E2%80%99s%20Guide%2C%202nd%20Ed.-%20English.pdf
// Scale anchor: the 2100 px × 3000 px source photo's device envelope measures
//   1843 px × 2774 px. REFERENCE_MM_PER_PIXEL balances the published width and
//   height against that envelope, then expands the entire image plane while
//   preserving the photo's native aspect ratio. The photo remains a visual aid,
//   not a claim about hidden internal dimensions.
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

const REFERENCE_WIDTH_MM = 134.6;
const REFERENCE_HEIGHT_MM = 203.2;
const REFERENCE_THICKNESS_MM = 9.1;
const REFERENCE_IMAGE_PIXEL_WIDTH = 2100;
const REFERENCE_DEVICE_PIXEL_WIDTH = 1843;
const REFERENCE_DEVICE_PIXEL_HEIGHT = 2774;
const REFERENCE_MM_PER_PIXEL = (
  (REFERENCE_WIDTH_MM / REFERENCE_DEVICE_PIXEL_WIDTH)
  + (REFERENCE_HEIGHT_MM / REFERENCE_DEVICE_PIXEL_HEIGHT)
) / 2;
const REFERENCE_IMAGE_WIDTH_MM = REFERENCE_IMAGE_PIXEL_WIDTH * REFERENCE_MM_PER_PIXEL;

const bodyWidth = param('bodyWidth', REFERENCE_WIDTH_MM, {
  min: 120,
  max: 150,
  description: 'published exterior width in mm; photo scale anchor',
});
const bodyHeight = param('bodyHeight', REFERENCE_HEIGHT_MM, {
  min: 185,
  max: 220,
  description: 'published exterior height in mm',
});
const bodyThickness = param('bodyThickness', REFERENCE_THICKNESS_MM, {
  min: 7,
  max: 13,
  description: 'published exterior thickness in mm',
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
  scale: REFERENCE_IMAGE_WIDTH_MM,
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
const displayCenterY = frontY.add(screenRecess.multiply(0.5));
const navigationCenterY = frontY.add(0.58);
const ledCenterY = frontY.add(0.64);

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
  .translate(0, displayCenterY, screenCenterZ);

const navigationControl = cylinder(
  screenRecess.multiply(0.42),
  controlDiameter.divide(2),
  64,
)
  .material(CONTROL_MATERIAL)
  .alongAxis([0, 1, 0])
  .translate(0, navigationCenterY, navigationCenterZ);

const statusLed = cylinder(screenRecess.multiply(0.28), 1.15, 32)
  .material(LED_MATERIAL)
  .alongAxis([0, 1, 0])
  .translate(0, ledCenterY, ledCenterZ);

// Mate-style connectors currently use numeric Vec3 origins. These three
// default-state points are deliberately just inside each retained component's
// edge and within 1 mm of the matching housing pocket wall, so the solved
// fastened graph describes a physical retention relationship rather than an
// arbitrary origin-to-origin graph. The legacy seats below remain ParamRef
// expressions: editable dimensions move their inspectable placement metadata
// together with the visible geometry.
const DEFAULT_DISPLAY_FASTENER = [46.8, -4.1, 25.1];
const DEFAULT_NAVIGATION_FASTENER = [9.3, -3.97, -60.9];
const DEFAULT_LED_FASTENER = [0.95, -3.91, -77.4];

const reader = assembly('photo-reference-e-reader');
// Static retention connectors share the same ParamRef expressions as their
// visible inset geometry. A body/screen edit therefore moves both the model
// and its inspectable assembly metadata instead of leaving stale numbers.
const housingPart = reader.part('housing', housing, {
  connectors: {
    displaySeat: { origin: [0, displayCenterY, screenCenterZ] },
    navigationSeat: { origin: [0, navigationCenterY, navigationCenterZ] },
    ledSeat: { origin: [0, ledCenterY, ledCenterZ] },
  },
});
const displayPart = reader.part('display', display, {
  connectors: { mount: { origin: [0, displayCenterY, screenCenterZ] } },
  connect: {
    connector: 'mount',
    to: housingPart.connector('displaySeat'),
    name: 'display-retained',
  },
});
const navigationPart = reader.part('navigation-control', navigationControl, {
  connectors: { mount: { origin: [0, navigationCenterY, navigationCenterZ] } },
  connect: {
    connector: 'mount',
    to: housingPart.connector('navigationSeat'),
    name: 'navigation-retained',
  },
});
const ledPart = reader.part('status-led', statusLed, {
  connectors: { mount: { origin: [0, ledCenterY, ledCenterZ] } },
  connect: {
    connector: 'mount',
    to: housingPart.connector('ledSeat'),
    name: 'led-retained',
  },
});

// The ParamRef-backed seats above preserve editable placement intent; these
// fastened frame pairs are the solver-facing graph that keeps the four parts
// connected for mechanism checks and downstream assembly consumers.
housingPart
  .connector('display-fastener', { type: 'frame', origin: { kind: 'vec3', value: DEFAULT_DISPLAY_FASTENER } })
  .connector('navigation-fastener', { type: 'frame', origin: { kind: 'vec3', value: DEFAULT_NAVIGATION_FASTENER } })
  .connector('led-fastener', { type: 'frame', origin: { kind: 'vec3', value: DEFAULT_LED_FASTENER } });
displayPart.connector('housing-fastener', {
  type: 'frame', origin: { kind: 'vec3', value: DEFAULT_DISPLAY_FASTENER },
});
navigationPart.connector('housing-fastener', {
  type: 'frame', origin: { kind: 'vec3', value: DEFAULT_NAVIGATION_FASTENER },
});
ledPart.connector('housing-fastener', {
  type: 'frame', origin: { kind: 'vec3', value: DEFAULT_LED_FASTENER },
});

reader.mate('display-fastened', 'housing.display-fastener', 'display.housing-fastener', 'fastened');
reader.mate('navigation-fastened', 'housing.navigation-fastener', 'navigation-control.housing-fastener', 'fastened');
reader.mate('led-fastened', 'housing.led-fastener', 'status-led.housing-fastener', 'fastened');

return reader.solvedModel({});
