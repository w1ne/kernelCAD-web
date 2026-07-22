// ESP32 E-Reader — component-aware fit and enclosure reference assembly.
//
// This replaces the public project's anonymous hollow box with the actual
// catalog envelopes that determine the device's packaging: an ESP32-WROOM-32
// module, Adafruit 4086 2.9 inch tri-colour panel, 1200 mAh pouch cell, and
// two 6 mm tactile controls. The enclosure, bezel, and carrier are expressly
// named fabricated mechanical context; none represents an invented catalog
// component.
//
// Known catalog / electrical boundary:
// The reusable catalog has no selected USB-C/programming connector, LiPo
// charger/protection circuit, or 3.3 V regulator carrier for this portable
// build. This assembly intentionally does not emulate those electrical parts.
// Select and model the real power/programming path before treating it as a
// release BOM or a LabWired-verified device.
//
// Public-proof status:
// No durable e-paper display-paint receipt exists yet.
// No firmware proof or LabWired run receipt binds this assembly yet.
// This CAD fit check is therefore not public-device proof; keep the release
// unverified until a retained firmware artifact and matching display-paint
// receipt are recorded for the same published revision.

const READER_WIDTH = 84;
const READER_HEIGHT = 74;
const READER_DEPTH = 16;
const BACK_FLOOR_TOP = -4;

const reader = assembly('esp32-e-reader-reference-assembly');

// ---------------------------------------------------------------------------
// ENCLOSURE AND DISPLAY BEZEL
//
// The body is a shallow rear shell. Its inner cavity is open toward +Z, where
// the separate bezel captures the e-paper panel. Page controls exit through
// two actual side apertures in the lower (negative-Y) wall.
// ---------------------------------------------------------------------------
// The catalog LiPo STEP measures 37 × 63 × 6 mm once its lead envelope is
// included, so the cavity uses the measured 63 mm axis rather than the older
// 53 mm catalog summary. It leaves 1.5 mm side clearance around that envelope.
const leftButtonAperture = box(10, 8, 10, true).translate(12, -35, 0);
const rightButtonAperture = box(10, 8, 10, true).translate(26, -35, 0);
const enclosureCavity = box(76, 66, 12, true).translate(0, 0, 2);
const enclosure = box(READER_WIDTH, READER_HEIGHT, READER_DEPTH, true)
  .fillet(3)
  .subtract(enclosureCavity, leftButtonAperture, rightButtonAperture)
  .color('#242a32');
const enclosurePart = reader.part('e-reader-enclosure', enclosure);
enclosurePart
  .connector('bezel-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [39, 0, 8] },
  })
  .connector('carrier-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [20, 0, BACK_FLOOR_TOP] },
  })
  .connector('battery-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-18, 0, BACK_FLOOR_TOP] },
  })
  .connector('left-button-aperture', {
    type: 'frame',
    origin: { kind: 'vec3', value: [12, -35, 0] },
  })
  .connector('right-button-aperture', {
    type: 'frame',
    origin: { kind: 'vec3', value: [26, -35, 0] },
  });

const bezelOuter = box(78, 68, 1.2, true).translate(0, 0, 8.8);
const bezelWindow = box(64, 44, 2, true).translate(0, 5, 8.8);
const bezel = bezelOuter.subtract(bezelWindow).color('#101419');
const bezelPart = reader.part('display-bezel', bezel);
bezelPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [39, 0, 8.2] },
  })
  // On the right edge of the clear window: this support lands against the
  // panel's outside face rather than intersecting the display glass.
  .connector('display-retainer', {
    type: 'frame',
    origin: { kind: 'vec3', value: [32, 5, 8.8] },
  });

// ---------------------------------------------------------------------------
// FABRICATED CARRIER
//
// A narrow rigid carrier keeps the ESP32 clear of the pouch cell. The lower
// support bracket supplies actual material behind the two side-mounted tactile
// switches, rather than leaving controls floating in the enclosure.
// ---------------------------------------------------------------------------
const controllerCarrier = box(30, 53, 1.2, true).translate(20, 0, -2.2);
const controlBracket = box(30, 7, 4, true).translate(20, -29.5, 0);
const carrier = controllerCarrier.union(controlBracket).color('#155e3a');
const carrierPart = reader.part('electronics-carrier', carrier);
carrierPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [20, 0, -2.8] },
  })
  .connector('controller-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [20, 9, -1.6] },
  })
  .connector('left-button-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [12, -33, 0] },
  })
  .connector('right-button-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [26, -33, 0] },
  });

// ---------------------------------------------------------------------------
// CATALOG COMPONENTS
//
// Each fetch is serial: STEP import uses one OCCT host session. recenter()
// puts vendor-local origins at the assembly datum before precise placement.
// ---------------------------------------------------------------------------
const display = (await (await lib.fetchPart('epaper-29-tricolor')).recenter())
  .rotateX(90)
  .translate(0, 5, 5.3)
  .color('#e6e0cf');
const controller = (await (await lib.fetchPart('esp32-wroom-32')).recenter())
  .translate(20, 9, 0)
  .color('#b8bcc0');
const battery = (await (await lib.fetchPart('lipo-1200mah-pouch')).recenter())
  .translate(-18, 0, 0)
  .color('#d99b3d');
const leftButton = (await (await lib.fetchPart('pushbutton-6mm')).recenter())
  .rotateX(-90)
  .translate(12, -35.5, 0)
  .color('#3f4650');
const rightButton = (await (await lib.fetchPart('pushbutton-6mm')).recenter())
  .rotateX(-90)
  .translate(26, -35.5, 0)
  .color('#3f4650');

const displayPart = reader.part('epaper-29-tricolor-display', display);
displayPart.connector('bezel-retainer', {
  type: 'frame',
  // Measured after the X rotation: imported panel edge is 31.368 mm from
  // center and the glass/support stack reaches Z=8.11 mm at this placement.
  origin: { kind: 'vec3', value: [31.368, 5, 8.11] },
});

const controllerPart = reader.part('esp32-wroom-32-controller', controller);
controllerPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [20, 9, -1.55] },
});

const batteryPart = reader.part('lipo-1200mah-pouch-battery', battery);
batteryPart.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-18, 0, -3] },
});

const leftButtonPart = reader.part('page-turn-button-left', leftButton);
leftButtonPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [12, -33, 0] },
});

const rightButtonPart = reader.part('page-turn-button-right', rightButton);
rightButtonPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [26, -33, 0] },
});

// The mate graph retains every independently modeled component. Coordinates
// are deliberately chosen at real support faces, so the solved scene preserves
// the authored fit while exposing the enclosure, bezel, carrier, display,
// controller, battery, and controls as separately inspectable parts.
reader.mate(
  'bezel-retained-in-enclosure',
  'e-reader-enclosure.bezel-seat',
  'display-bezel.enclosure-mount',
  'fastened',
);
reader.mate(
  'carrier-retained-in-enclosure',
  'e-reader-enclosure.carrier-seat',
  'electronics-carrier.enclosure-mount',
  'fastened',
);
reader.mate(
  'display-retained-by-bezel',
  'display-bezel.display-retainer',
  'epaper-29-tricolor-display.bezel-retainer',
  'fastened',
);
reader.mate(
  'controller-on-carrier',
  'electronics-carrier.controller-seat',
  'esp32-wroom-32-controller.carrier-mount',
  'fastened',
);
reader.mate(
  'battery-retained-in-enclosure',
  'e-reader-enclosure.battery-seat',
  'lipo-1200mah-pouch-battery.enclosure-mount',
  'fastened',
);
reader.mate(
  'left-button-installed',
  'electronics-carrier.left-button-seat',
  'page-turn-button-left.carrier-mount',
  'fastened',
);
reader.mate(
  'right-button-installed',
  'electronics-carrier.right-button-seat',
  'page-turn-button-right.carrier-mount',
  'fastened',
);

return reader.solvedModel({});
