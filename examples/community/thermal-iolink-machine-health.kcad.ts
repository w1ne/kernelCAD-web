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
const electronicsCavityWidthMm = 58.0;
const electronicsCavityDepthMm = 40.0;
const rearPanelY = enclosureDepthMm / 2;
const frontPanelY = -enclosureDepthMm / 2;
const enclosureWallDepthMm = (enclosureDepthMm - electronicsCavityDepthMm) / 2;
const cavityFrontY = frontPanelY + enclosureWallDepthMm;
const cavityRightWallX = electronicsCavityWidthMm / 2;
const cameraCenterZ = 0.0;

// The catalog MLX90640 model is 11.7 mm deep after rotateX(90). Keep its
// viewing face 0.15 mm inside the cavity rather than burying it in the front
// wall, then land the carrier directly on its rear mounting plane.
const mlx90640DepthAlongYmm = 11.7;
const cameraFrontClearanceMm = 0.15;
const cameraCenterY = cavityFrontY + cameraFrontClearanceMm + mlx90640DepthAlongYmm / 2;
const cameraRearFaceY = cameraCenterY + mlx90640DepthAlongYmm / 2;
const carrierThicknessMm = 1.6;
const carrierFrontFaceY = cameraRearFaceY;
const carrierY = carrierFrontFaceY + carrierThicknessMm / 2;
const carrierRearFaceY = carrierY + carrierThicknessMm / 2;
const carrierSupportDepthMm = carrierFrontFaceY - cavityFrontY;
const carrierSupportCenterY = cavityFrontY + carrierSupportDepthMm / 2;
const m12RetainerContactRadiusMm = 8.2;
const m12PanelBoreRadiusMm = 8.3;

// These are the catalog records' post-rotation depths along Y. Position the
// controller and PHY so their mounting faces meet the carrier's rear face
// without passing through it.
const esp32C3DepthAlongYmm = 5.56;
const max14827DepthAlongYmm = 5.1;
const esp32CenterY = carrierRearFaceY + esp32C3DepthAlongYmm / 2;
const max14827CenterY = carrierRearFaceY + max14827DepthAlongYmm / 2;
const esp32RearFaceY = esp32CenterY + esp32C3DepthAlongYmm / 2;

// The buck shares neither the sensor plane nor the crowded rear carrier
// plane. A right-side enclosure shelf carries it 0.4 mm behind the ESP32
// envelope and well ahead of the M12's internal body. Its catalog -Z mating
// face is oriented toward that rear shelf, leaving components toward the
// clearance in front of it.
const buck24v3v3DepthAlongYmm = 5.6;
const buck24v3v3WidthMm = 24.0;
const buckBoardClearanceMm = 0.4;
const buckFrontFaceY = esp32RearFaceY + buckBoardClearanceMm;
const buckCenterY = buckFrontFaceY + buck24v3v3DepthAlongYmm / 2;
const powerShelfFrontY = buckCenterY + buck24v3v3DepthAlongYmm / 2;
const powerShelfThicknessMm = 1.6;
const powerShelfY = powerShelfFrontY + powerShelfThicknessMm / 2;
const powerShelfWidthMm = 28.0;
const powerShelfX = cavityRightWallX - powerShelfWidthMm / 2;
const buckRightSideClearanceMm = 4.0;
const buckCenterX = cavityRightWallX - buckRightSideClearanceMm - buck24v3v3WidthMm / 2;

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
const electronicsCavity = box(electronicsCavityWidthMm, electronicsCavityDepthMm, 22.0, true)
  .translate(0, 0, 0);
// Run the aperture through the 4 mm wall and 0.4 mm into the cavity so the
// optical path stays open even after boolean tolerance is applied.
const thermalAperture = box(12.0, enclosureWallDepthMm + 0.4, 10.0, true)
  .translate(0, frontPanelY, cameraCenterZ);
// Clear the catalog connector's 16 mm retained barrel with 0.1 mm radial
// allowance; its larger coupling shell remains outside the service panel.
const m12PanelBore = cylinder(12.0, m12PanelBoreRadiusMm, 64)
  .alongAxis([0, 1, 0])
  .translate(0, rearPanelY - 6.0, 0);
const enclosure = outerBody
  .subtract(electronicsCavity, thermalAperture, m12PanelBore)
  .color('#334155');
const enclosurePart = thermal.part('industrial-sensor-enclosure', enclosure);
enclosurePart
  .connector('carrier-support-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, cavityFrontY, 0] },
  })
  .connector('aperture-bezel-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, frontPanelY, cameraCenterZ] },
  })
  .connector('m12-panel-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, rearPanelY - 4.0, 0] },
  })
  .connector('power-regulator-shelf-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [cavityRightWallX, powerShelfY, 0] },
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
const m12ClampBore = cylinder(6.0, m12RetainerContactRadiusMm, 64)
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
    // Mate on the annular retaining material, not at the empty bore center.
    origin: { kind: 'vec3', value: [m12RetainerContactRadiusMm, rearPanelY - 6.0, 0] },
  });

// ---------------------------------------------------------------------------
// CARRIER
//
// This vertical carrier is set behind the MLX90640's actual 11.7 mm package
// depth. The camera meets its -Y face, while controller and PHY hardware meet
// its +Y face; no catalog package is embedded in the carrier plate.
// ---------------------------------------------------------------------------
// Two rails bridge from the enclosure's inner front wall to the carrier. They
// sit outside the MLX90640 board's 25.4 mm width, preserving a clear optical
// path and a physical load path for the carrier mate.
const carrierSupportLeft = box(3.0, carrierSupportDepthMm, 21.0, true)
  .translate(-19.0, carrierSupportCenterY, 0);
const carrierSupportRight = box(3.0, carrierSupportDepthMm, 21.0, true)
  .translate(19.0, carrierSupportCenterY, 0);
// A crossbar above the 18 mm carrier joins the two rails into one load path
// without entering the MLX90640 board envelope.
const carrierSupportCrossbar = box(38.0, carrierSupportDepthMm, 1.4, true)
  .translate(0, carrierSupportCenterY, 10.0);
const carrierSupportRails = carrierSupportLeft
  .union(carrierSupportRight)
  .union(carrierSupportCrossbar)
  .color('#64748b');
const carrierSupportPart = thermal.part('carrier-support-rails', carrierSupportRails);
carrierSupportPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, cavityFrontY, 0] },
  })
  .connector('carrier-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierFrontFaceY, 0] },
  });

const carrier = box(46.0, carrierThicknessMm, 18.0, true)
  .translate(0, carrierY, 0)
  .color('#166534');
const carrierPart = thermal.part('electronics-carrier', carrier);
carrierPart
  .connector('support-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-19.0, carrierFrontFaceY, 0] },
  })
  .connector('mlx90640-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, carrierFrontFaceY, cameraCenterZ] },
  })
  .connector('esp32-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-11.5, carrierRearFaceY, 0] },
  })
  .connector('max14827-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [12.0, carrierRearFaceY, 0] },
  });

// This shelf is a project-specific mechanical interface. It spans from the
// enclosure's right inner wall to the catalog buck footprint without
// displacing the universal sensor, controller, PHY, or connector models.
const powerShelf = box(powerShelfWidthMm, powerShelfThicknessMm, 14.0, true)
  .translate(powerShelfX, powerShelfY, 0)
  .color('#475569');
const powerShelfPart = thermal.part('power-regulator-shelf', powerShelf);
powerShelfPart
  .connector('enclosure-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [cavityRightWallX, powerShelfY, 0] },
  })
  .connector('buck-seat', {
    type: 'frame',
    origin: { kind: 'vec3', value: [buckCenterX, powerShelfFrontY, 0] },
  });

thermal.mate('carrier-supports-retained-in-enclosure', 'industrial-sensor-enclosure.carrier-support-seat', 'carrier-support-rails.enclosure-mount', 'fastened');
thermal.mate('carrier-retained-on-supports', 'carrier-support-rails.carrier-mount', 'electronics-carrier.support-mount', 'fastened');
thermal.mate('bezel-retained-in-enclosure', 'industrial-sensor-enclosure.aperture-bezel-seat', 'thermal-aperture-bezel.enclosure-mount', 'fastened');
thermal.mate('m12-clamp-retained-in-enclosure', 'industrial-sensor-enclosure.m12-panel-seat', 'm12-panel-clamp.enclosure-mount', 'fastened');
thermal.mate('power-regulator-shelf-retained-in-enclosure', 'industrial-sensor-enclosure.power-regulator-shelf-seat', 'power-regulator-shelf.enclosure-mount', 'fastened');

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
  .translate(-11.5, esp32CenterY, 0)
  .color('#1e3a8a');
const max14827 = (await (await lib.fetchPart('max14827')).recenter())
  .rotateX(-90)
  .translate(12.0, max14827CenterY, 0)
  .color('#3f3f46');
// The catalog M12 model is already axial along Y. Its rear portion projects
// beyond the service face while its mounting barrel passes through the panel
// bore and is retained by the modeled internal collar.
const m12 = (await (await lib.fetchPart('m12-iolink-5pin')).recenter())
  .translate(0, rearPanelY + 4.0, 0)
  .color('#a16207');
// This is only a mechanical placement of the reusable power module. Wiring,
// thermal derating, isolation, and IO-Link behavior remain out of scope.
const buck24v3v3 = (await (await lib.fetchPart('buck-24v-3v3')).recenter())
  .rotateX(90)
  .translate(buckCenterX, buckCenterY, 0)
  .color('#0f766e');

const mlxPart = thermal.part('mlx90640-thermal-camera', mlx90640);
mlxPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, carrierFrontFaceY, cameraCenterZ] },
});
const esp32Part = thermal.part('esp32-c3-supermini-controller', esp32C3);
esp32Part.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [-11.5, carrierRearFaceY, 0] },
});
const phyPart = thermal.part('max14827-iolink-phy', max14827);
phyPart.connector('carrier-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [12.0, carrierRearFaceY, 0] },
});
const m12Part = thermal.part('m12-iolink-5pin-connector', m12);
m12Part.connector('enclosure-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [m12RetainerContactRadiusMm, rearPanelY - 6.0, 0] },
});
const buckPart = thermal.part('buck-24v-3v3-power-regulator', buck24v3v3);
buckPart.connector('shelf-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [buckCenterX, powerShelfFrontY, 0] },
});

thermal.mate('mlx90640-on-carrier', 'electronics-carrier.mlx90640-seat', 'mlx90640-thermal-camera.carrier-mount', 'fastened');
thermal.mate('esp32-on-carrier', 'electronics-carrier.esp32-seat', 'esp32-c3-supermini-controller.carrier-mount', 'fastened');
thermal.mate('max14827-on-carrier', 'electronics-carrier.max14827-seat', 'max14827-iolink-phy.carrier-mount', 'fastened');
thermal.mate('m12-retained-by-panel-clamp', 'm12-panel-clamp.m12-retainer-seat', 'm12-iolink-5pin-connector.enclosure-mount', 'fastened');
thermal.mate('buck-24v-3v3-on-power-shelf', 'power-regulator-shelf.buck-seat', 'buck-24v-3v3-power-regulator.shelf-mount', 'fastened');

return thermal.solvedModel({});
