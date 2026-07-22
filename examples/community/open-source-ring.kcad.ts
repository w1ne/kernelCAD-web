// SPDX-License-Identifier: MIT
// Open Source Ring — reusable C-band/signet reference assembly.
//
// This model deliberately uses catalog package geometry for every active
// electronic component. The enclosure and carrier are source geometry because
// they are project-specific mechanical interfaces; the five silicon packages
// and the haptic actuator remain independently addressable assembly parts.

// Design brief
// - 17.6 mm nominal inner diameter, open at the palm-side for swelling comfort.
// - A dorsal signet pod carries a vertical rigid-flex carrier.
// - MAX30102 looks radially inward through a skin-side optical window.
// - TMP117 sits on an explicit finger-facing thermal path, not on the dorsal face.
// - A real ERM vibration motor is mounted in a dorsal service pocket.
// - This is a fit-and-layout reference, not a clinical or waterproofing claim.

const cBandGapMm = param('cBandGapMm', 7.0, {
  min: 5.0,
  max: 10.0,
  description: 'Palm-side opening between the two C-band ends.',
});

const ring = assembly('Open Source Ring reference assembly');

// ---------------------------------------------------------------------------
// OPEN C-BAND / SIGNET ENCLOSURE
//
// The finger axis is world Z. The signet pod is placed on +Y (dorsal side);
// its radial-inward wall faces the finger at -Y. Keeping the band and shell in
// one named part reflects the intended monolithic enclosure fabrication.
// ---------------------------------------------------------------------------
const bandMajorRadius = 10.6;
const bandTubeRadius = 1.8;
const signetCenterY = 11.5;
const signetCenterZ = 1.3;
const sensorCenterZ = 1.5;
const carrierCenterZ = 1.7;
// Keep the lower haptic-driver package clear of the pod's cavity floor.
const drv2605MountZ = -1.0;

// The temperature package is not a dorsal ambient sensor. A short flex tongue
// carries it to a finger-facing thermal window, with a compliant insulating
// pad as the explicit thermal path. These values use the authored package
// envelope (TMP117: 1.488 × 0.95 × 0.531 mm) and retain nominal fit margins.
const tmp117PackageRadialMm = 0.531;
const tmp117PackageVerticalMm = 0.95;
const tmp117MountX = 4.8;
const tmp117MountZ = 1.4;
const tmp117CarrierFaceY = 9.9655;
const tmp117MountY = tmp117CarrierFaceY - tmp117PackageRadialMm / 2;
const tmp117SkinFaceY = tmp117MountY - tmp117PackageRadialMm / 2;
const thermalWindowCenterY = 8.45;
const thermalWindowThicknessMm = 0.9;
const thermalWindowInnerFaceY = thermalWindowCenterY + thermalWindowThicknessMm / 2;
const thermalWindowWidthMm = 3.2;
const thermalWindowHeightMm = 1.8;
const thermalWindowCutoutClearanceMm = 0.1;
const thermalPadLengthMm = tmp117SkinFaceY - thermalWindowInnerFaceY;
const minComponentClearanceMm = 0.5;
const drv2605PackageVerticalMm = 1.44;
const tmp117ToDrvClearanceMm =
  tmp117MountZ - tmp117PackageVerticalMm / 2 -
  (drv2605MountZ + drv2605PackageVerticalMm / 2);
if (thermalPadLengthMm <= 0 || tmp117ToDrvClearanceMm < minComponentClearanceMm) {
  throw new Error('Open Source Ring thermal or haptic component clearance is invalid.');
}

// Precision Microdrives 304-002 is a 4 mm diameter, 8 mm body ERM. Its
// authored catalog model includes the documented 3 mm eccentric-weight
// envelope, so this slightly larger service pocket is deliberate.
const hapticActuatorCenterY = 15.15;
const hapticActuatorEnvelopeLengthMm = 12.15;
const hapticActuatorEnvelopeRadiusMm = 2.2;
const hapticPocketAxialClearanceMm = 0.15;
const hapticPocketRadialClearanceMm = 0.15;
const hapticPocketLengthMm = hapticActuatorEnvelopeLengthMm + hapticPocketAxialClearanceMm * 2;
const hapticPocketRadiusMm = hapticActuatorEnvelopeRadiusMm + hapticPocketRadialClearanceMm;

const openBand = torus(bandMajorRadius, bandTubeRadius, 96)
  .subtract(
    box(18, cBandGapMm, 18, true).translate(0, -13.0, 0),
  );

const signetOuter = box(18.0, 7.0, 9.0, true)
  .fillet(1.0)
  .translate(0, signetCenterY, signetCenterZ);
const signetCavity = box(16.0, 5.4, 7.2, true)
  .translate(0, 11.6, 1.7);
// The optical port only traverses the 0.9 mm skin-side shell wall and opens
// 0.1 mm into the cavity. It deliberately stops before the dorsal wall.
const ppgApertureDepthMm = 1.1;
const ppgAperture = cylinder(ppgApertureDepthMm, 2.7, 64)
  .alongAxis([0, 1, 0])
  .translate(0, 7.9, sensorCenterZ);
const thermalWindowAperture = box(
  thermalWindowWidthMm + thermalWindowCutoutClearanceMm * 2,
  1.1,
  thermalWindowHeightMm + thermalWindowCutoutClearanceMm * 2,
  true,
).translate(tmp117MountX, thermalWindowCenterY, tmp117MountZ);
const hapticActuatorPocket = cylinder(hapticPocketLengthMm, hapticPocketRadiusMm, 64)
  .alongAxis([1, 0, 0])
  .translate(-hapticPocketLengthMm / 2, hapticActuatorCenterY, signetCenterZ);
// Cut the cavity after merging the band and pod. The band otherwise protrudes
// back into the pod's interior and collides with the carrier.
const enclosure = openBand
  .union(signetOuter)
  .subtract(signetCavity, ppgAperture, thermalWindowAperture, hapticActuatorPocket)
  .color('#2d3339');
const enclosurePart = ring.part('open-c-band-enclosure', enclosure);
enclosurePart
  .connector('carrier-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 11.0, carrierCenterZ] },
  })
  .connector('ppg-window-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 8.3, sensorCenterZ] },
  })
  .connector('thermal-window-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, thermalWindowCenterY, tmp117MountZ] },
  })
  .connector('haptic-actuator-pocket', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, hapticActuatorCenterY, signetCenterZ] },
  });

// ---------------------------------------------------------------------------
// CARRIER, OPTICAL WINDOW, AND THERMAL PATH
//
// The carrier stands in the XZ plane, so its two component faces are radial.
// Its main face carries protected logic. A fused rigid-flex tongue reaches
// inward to support TMP117, while the thermal window/pad form a distinct,
// inspectable path to the finger-facing side.
// ---------------------------------------------------------------------------
const carrierBase = box(15.4, 0.8, 6.8, true)
  .translate(0, 11.0, carrierCenterZ);
const carrierInnerFaceY = 10.6;
const flexTongueOverlapMm = 0.025;
const flexTongueOuterFaceY = tmp117CarrierFaceY;
const flexTongueLengthMm = carrierInnerFaceY + flexTongueOverlapMm - flexTongueOuterFaceY;
const thermalSensorFlex = box(3.0, flexTongueLengthMm, 1.8, true)
  .translate(
    tmp117MountX,
    flexTongueOuterFaceY + flexTongueLengthMm / 2,
    tmp117MountZ,
  );
const carrier = carrierBase
  .union(thermalSensorFlex)
  .color('#166534');
const carrierPart = ring.part('electronics-carrier', carrier);
carrierPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 11.0, carrierCenterZ] },
  })
  .connector('nrf54l15-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-3.0, 11.85, 1.8] },
  })
  .connector('bmi270-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [4.25, 11.84, 3.55] },
  })
  .connector('max30102-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 9.82, sensorCenterZ] },
  })
  .connector('tmp117-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, tmp117CarrierFaceY, tmp117MountZ] },
  })
  .connector('drv2605-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [4.9, 11.75, drv2605MountZ] },
  });

const ppgWindow = cylinder(1.2, 2.35, 64)
  .alongAxis([0, 1, 0])
  .translate(0, 7.7, sensorCenterZ)
  .color('#7dd3fc');
const ppgWindowPart = ring.part('skin-side-ppg-window', ppgWindow);
ppgWindowPart.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 8.3, sensorCenterZ] },
});

const thermalWindow = box(
  thermalWindowWidthMm,
  thermalWindowThicknessMm,
  thermalWindowHeightMm,
  true,
)
  .translate(tmp117MountX, thermalWindowCenterY, tmp117MountZ)
  .color('#a8afb8');
const thermalWindowPart = ring.part('skin-thermal-window', thermalWindow);
thermalWindowPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, thermalWindowCenterY, tmp117MountZ] },
  })
  .connector('pad-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, thermalWindowInnerFaceY, tmp117MountZ] },
  });

const thermalCouplingPad = box(2.4, thermalPadLengthMm, 1.1, true)
  .translate(
    tmp117MountX,
    thermalWindowInnerFaceY + thermalPadLengthMm / 2,
    tmp117MountZ,
  )
  .color('#6b7280');
const thermalCouplingPadPart = ring.part('thermal-coupling-pad', thermalCouplingPad);
thermalCouplingPadPart
  .connector('window-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, thermalWindowInnerFaceY, tmp117MountZ] },
  })
  .connector('sensor-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, tmp117SkinFaceY, tmp117MountZ] },
  });

ring.mate(
  'carrier-retained-in-enclosure',
  'open-c-band-enclosure.carrier-seat',
  'electronics-carrier.enclosure-mount',
  'fastened',
);
ring.mate(
  'ppg-window-retained-in-enclosure',
  'open-c-band-enclosure.ppg-window-seat',
  'skin-side-ppg-window.enclosure-mount',
  'fastened',
);
ring.mate(
  'thermal-window-retained-in-enclosure',
  'open-c-band-enclosure.thermal-window-seat',
  'skin-thermal-window.enclosure-mount',
  'fastened',
);
ring.mate(
  'thermal-pad-against-window',
  'skin-thermal-window.pad-contact',
  'thermal-coupling-pad.window-contact',
  'fastened',
);

// ---------------------------------------------------------------------------
// CATALOG ELECTRONICS
//
// recenter() is essential: catalog STEP package origins are vendor-local. The
// rotation puts each package's former +Z face normal on its intended carrier
// face. There are no substitute component bodies in this assembly.
// ---------------------------------------------------------------------------
// Keep each lower/recenter operation serial: the OCCT WASM host is a single
// kernel session, so concurrent STEP imports are not a safe assembly pattern.
const nrf54l15 = (await (await lib.fetchPart('nrf54l15-qfn48')).recenter())
  .rotateX(-90)
  .translate(-3.0, 11.85, 1.8)
  .color('#20242a');
const bmi270 = (await (await lib.fetchPart('bmi270-lga14')).recenter())
  .rotateX(-90)
  .translate(4.25, 11.84, 3.55)
  .color('#30343b');
const max30102 = (await (await lib.fetchPart('max30102-optical')).recenter())
  .rotateX(90)
  .translate(0, 9.82, sensorCenterZ)
  .color('#111827');
const tmp117 = (await (await lib.fetchPart('tmp117-dsbga')).recenter())
  .rotateX(90)
  .translate(tmp117MountX, tmp117MountY, tmp117MountZ)
  .color('#374151');
const drv2605 = (await (await lib.fetchPart('drv2605-yzf')).recenter())
  .rotateX(-90)
  .translate(4.9, 11.75, drv2605MountZ)
  .color('#4b5563');
const hapticActuator = (await (
  await lib.fetchPart('precision-microdrives-304-002-erm')
).recenter())
  .translate(0, hapticActuatorCenterY, signetCenterZ)
  .color('#565d66');

const nrf54l15Part = ring.part('nrf54l15-qfn48-soc', nrf54l15);
nrf54l15Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-3.0, 11.85, 1.8] },
});
const bmi270Part = ring.part('bmi270-lga14-imu', bmi270);
bmi270Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [4.25, 11.84, 3.55] },
});
const max30102Part = ring.part('max30102-optical-ppg', max30102);
max30102Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 9.82, sensorCenterZ] },
});
const tmp117Part = ring.part('tmp117-dsbga-skin-temperature', tmp117);
tmp117Part
  .connector('carrier-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, tmp117CarrierFaceY, tmp117MountZ] },
  })
  .connector('thermal-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [tmp117MountX, tmp117SkinFaceY, tmp117MountZ] },
  });
const drv2605Part = ring.part('drv2605-yzf-haptic-driver', drv2605);
drv2605Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [4.9, 11.75, drv2605MountZ] },
});
const hapticActuatorPart = ring.part(
  'precision-microdrives-304-002-erm-haptic-actuator',
  hapticActuator,
);
hapticActuatorPart.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, hapticActuatorCenterY, signetCenterZ] },
});

ring.mate('nrf54l15-on-carrier', 'electronics-carrier.nrf54l15-seat', 'nrf54l15-qfn48-soc.carrier-mount', 'fastened');
ring.mate('bmi270-on-carrier', 'electronics-carrier.bmi270-seat', 'bmi270-lga14-imu.carrier-mount', 'fastened');
ring.mate('max30102-on-carrier', 'electronics-carrier.max30102-seat', 'max30102-optical-ppg.carrier-mount', 'fastened');
ring.mate('tmp117-on-carrier', 'electronics-carrier.tmp117-seat', 'tmp117-dsbga-skin-temperature.carrier-mount', 'fastened');
ring.mate('tmp117-coupled-to-thermal-pad', 'thermal-coupling-pad.sensor-contact', 'tmp117-dsbga-skin-temperature.thermal-contact', 'fastened');
ring.mate('drv2605-on-carrier', 'electronics-carrier.drv2605-seat', 'drv2605-yzf-haptic-driver.carrier-mount', 'fastened');
ring.mate('haptic-actuator-retained-in-enclosure', 'open-c-band-enclosure.haptic-actuator-pocket', 'precision-microdrives-304-002-erm-haptic-actuator.enclosure-mount', 'fastened');

// Solve the declared fastened mates before returning the scene. This keeps the
// connector graph available to assembly validation instead of presenting
// unrelated static bodies.
return ring.solvedModel({});
