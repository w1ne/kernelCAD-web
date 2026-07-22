// SPDX-License-Identifier: MIT
// Thermal IO-Link machine-health sensor — component-aware reference assembly.
//
// This is a fit-and-layout reference for the public proto.cat device. Every
// electrical item represented here is loaded through the catalog rather than
// represented by a generic solid. The enclosure, carrier, and aperture bezel
// are intentionally project-specific mechanical interfaces.
//
// Coordinate convention: +Y is the field/service side (M12 cable side), -Y is
// the thermal viewing side, and +Z is up. The MLX90640 array faces -Y through
// the front aperture. This model makes no environmental, isolation, thermal
// accuracy, or IO-Link conformance claim.

const thermal = assembly('Thermal IO-Link machine-health reference assembly');

const enclosureLengthMm = 64.0;
const enclosureDepthMm = 48.0;
const enclosureHeightMm = 28.0;
const carrierY = -17.0;
const cameraCenterY = -18.6;
const cameraCenterZ = 0.0;
const rearPanelY = enclosureDepthMm / 2;
const frontPanelY = -enclosureDepthMm / 2;

// ---------------------------------------------------------------------------
// INDUSTRIAL ENCLOSURE AND EXTERNAL INTERFACES
//
// The hollow body has a real through-aperture in the viewing face and a M12
// panel bore in the service face. The camera can see out through the former;
// the latter carries the actual catalog connector rather than an imprecise
// connector-shaped cutout.
// ---------------------------------------------------------------------------
const outerBody = box(enclosureLengthMm, enclosureDepthMm, enclosureHeightMm, true)
  .fillet(3.0, { parallel: [0, 0, 1] });
const electronicsCavity = box(58.0, 40.0, 22.0, true).translate(0, 0, 0);
const thermalAperture = box(12.0, 7.0, 10.0, true)
  .translate(0, frontPanelY, cameraCenterZ);
const m12PanelBore = cylinder(12.0, 7.0, 64)
  .alongAxis([0, 1, 0])
  .translate(0, rearPanelY - 6.0, 0);
const enclosure = outerBody
  .subtract(electronicsCavity, thermalAperture, m12PanelBore)
  .color('#334155');
const enclosurePart = thermal.part('industrial-sensor-enclosure', enclosure);
enclosurePart
  .connector('carrier-support-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierY - 3.0, 0] },
  })
  .connector('aperture-bezel-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, frontPanelY, cameraCenterZ] },
  })
  .connector('m12-panel-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, rearPanelY - 4.0, 0] },
  });

// A separate face bezel identifies the optical interface and leaves the 12×10
// mm thermal opening clear. It seats on the enclosure rather than covering the
// sensor with an opaque slab.
const bezelOuter = box(18.0, 1.6, 15.0, true)
  .translate(0, frontPanelY - 0.8, cameraCenterZ);
const bezelOpening = box(12.0, 3.0, 10.0, true)
  .translate(0, frontPanelY - 0.8, cameraCenterZ);
const apertureBezel = bezelOuter.subtract(bezelOpening).color('#111827');
const bezelPart = thermal.part('thermal-aperture-bezel', apertureBezel);
bezelPart.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, frontPanelY, cameraCenterZ] },
});

// The internal retaining collar supplies the material interface that a panel
// M12 connector needs. Its clear bore deliberately leaves the catalog
// connector barrel free while the collar's outer face bears on the enclosure.
const m12ClampOuter = cylinder(4.0, 10.0, 64)
  .alongAxis([0, 1, 0])
  .translate(0, rearPanelY - 8.0, 0);
const m12ClampBore = cylinder(6.0, 6.2, 64)
  .alongAxis([0, 1, 0])
  .translate(0, rearPanelY - 9.0, 0);
const m12PanelClamp = m12ClampOuter.subtract(m12ClampBore).color('#64748b');
const m12ClampPart = thermal.part('m12-panel-clamp', m12PanelClamp);
m12ClampPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, rearPanelY - 4.0, 0] },
  })
  .connector('m12-retainer-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, rearPanelY - 6.0, 0] },
  });

// ---------------------------------------------------------------------------
// CARRIER
//
// This vertical carrier is close to the viewing wall. The camera boards mount
// against its -Y face, while controller and PHY hardware mount to its +Y face;
// this prevents a camera board from obstructing the optical opening.
// ---------------------------------------------------------------------------
// Two rails bridge the 2.2 mm gap between the enclosure's inner front wall and
// the carrier. They sit outside the MLX90640 board's 25.4 mm width, preserving
// a clear optical path and a physical load path for the carrier mate.
const carrierSupportLeft = box(3.0, 2.2, 21.0, true)
  .translate(-19.0, carrierY - 1.9, 0);
const carrierSupportRight = box(3.0, 2.2, 21.0, true)
  .translate(19.0, carrierY - 1.9, 0);
// A crossbar above the 18 mm carrier joins the two rails into one load path
// without entering the MLX90640 board envelope.
const carrierSupportCrossbar = box(38.0, 2.2, 1.4, true)
  .translate(0, carrierY - 1.9, 10.0);
const carrierSupportRails = carrierSupportLeft
  .union(carrierSupportRight)
  .union(carrierSupportCrossbar)
  .color('#64748b');
const carrierSupportPart = thermal.part('carrier-support-rails', carrierSupportRails);
carrierSupportPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierY - 3.0, 0] },
  })
  .connector('carrier-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierY - 0.8, 0] },
  });

const carrier = box(46.0, 1.6, 18.0, true)
  .translate(0, carrierY, 0)
  .color('#166534');
const carrierPart = thermal.part('electronics-carrier', carrier);
carrierPart
  .connector('support-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierY - 0.8, 0] },
  })
  .connector('mlx90640-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, carrierY - 0.8, cameraCenterZ] },
  })
  .connector('esp32-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-11.5, carrierY + 0.8, 0] },
  })
  .connector('max14827-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [12.0, carrierY + 0.8, 0] },
  });

thermal.mate('carrier-supports-retained-in-enclosure', 'industrial-sensor-enclosure.carrier-support-seat', 'carrier-support-rails.enclosure-mount', 'fastened');
thermal.mate('carrier-retained-on-supports', 'carrier-support-rails.carrier-mount', 'electronics-carrier.support-mount', 'fastened');
thermal.mate('bezel-retained-in-enclosure', 'industrial-sensor-enclosure.aperture-bezel-seat', 'thermal-aperture-bezel.enclosure-mount', 'fastened');
thermal.mate('m12-clamp-retained-in-enclosure', 'industrial-sensor-enclosure.m12-panel-seat', 'm12-panel-clamp.enclosure-mount', 'fastened');

// ---------------------------------------------------------------------------
// CATALOG ELECTRONICS
//
// Import serially: STEP import shares the OCCT kernel session. recenter() makes
// placement independent of each vendor STEP's native coordinate origin.
// ---------------------------------------------------------------------------
const mlx90640 = (await (await lib.fetchPart('mlx90640')).recenter())
  .rotateX(90)
  .translate(0, cameraCenterY, cameraCenterZ)
  .color('#d97706');
const esp32C3 = (await (await lib.fetchPart('esp32-c3-supermini-board')).recenter())
  .rotateX(-90)
  .translate(-11.5, carrierY + 1.3, 0)
  .color('#1e3a8a');
const max14827 = (await (await lib.fetchPart('max14827')).recenter())
  .rotateX(-90)
  .translate(12.0, carrierY + 1.6, 0)
  .color('#3f3f46');
// The catalog M12 model is already axial along Y. Its rear portion projects
// beyond the service face while its mounting barrel passes through the panel
// bore and is retained by the modeled internal collar.
const m12 = (await (await lib.fetchPart('m12-iolink-5pin')).recenter())
  .translate(0, rearPanelY + 4.0, 0)
  .color('#a16207');

const mlxPart = thermal.part('mlx90640-thermal-camera', mlx90640);
mlxPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, carrierY - 0.8, cameraCenterZ] },
});
const esp32Part = thermal.part('esp32-c3-supermini-controller', esp32C3);
esp32Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-11.5, carrierY + 0.8, 0] },
});
const phyPart = thermal.part('max14827-iolink-phy', max14827);
phyPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [12.0, carrierY + 0.8, 0] },
});
const m12Part = thermal.part('m12-iolink-5pin-connector', m12);
m12Part.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, rearPanelY - 6.0, 0] },
});

thermal.mate('mlx90640-on-carrier', 'electronics-carrier.mlx90640-seat', 'mlx90640-thermal-camera.carrier-mount', 'fastened');
thermal.mate('esp32-on-carrier', 'electronics-carrier.esp32-seat', 'esp32-c3-supermini-controller.carrier-mount', 'fastened');
thermal.mate('max14827-on-carrier', 'electronics-carrier.max14827-seat', 'max14827-iolink-phy.carrier-mount', 'fastened');
thermal.mate('m12-retained-by-panel-clamp', 'm12-panel-clamp.m12-retainer-seat', 'm12-iolink-5pin-connector.enclosure-mount', 'fastened');

// The public device also needs a 24 V→3.3 V power converter. Its authored
// catalog source exists as `buck-24v-3v3`, but the deployed catalog does not
// currently serve it. This assembly deliberately does not invent a solid for
// that missing part; deploy and validate the catalog record before adding its
// placement and calling this a complete physical BOM.

return thermal.solvedModel({});
