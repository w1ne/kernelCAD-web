// Functional front-facing five-finger robot hand.
//
// This keeps the original robot-hand render language: broad palm plate,
// black actuator window inserts, visible tendon rods into a wrist block, four
// vertical fingers, and an angled thumb. Unlike the old render-budget
// blockout, every visible solid is either unioned into a load-bearing body or
// belongs to an articulated clevis-jointed phalanx part.

const closeDeg = param('closeDeg', 22, { min: 0, max: 32 });

setCameraTarget(0, 0, 35);
setCameraDistance(285);

const hand = assembly('front-facing-five-finger-robot-hand');

const palmMaterial = { baseColor: '#b9b3a8', metalness: 0.0, roughness: 0.50 };
const darkMaterial = { baseColor: '#151719', metalness: 0.0, roughness: 0.62 };
const linkMaterial = { baseColor: '#d8d3c9', metalness: 0.0, roughness: 0.46 };
const tipMaterial = { baseColor: '#191b1d', metalness: 0.0, roughness: 0.60 };
const forkMaterial = { baseColor: '#676b6f', metalness: 0.0, roughness: 0.44 };
const tongueMaterial = { baseColor: '#c8c2b5', metalness: 0.0, roughness: 0.45 };
const pinMaterial = { baseColor: '#d6d9dc', metalness: 0.82, roughness: 0.22 };
const targetMaterial = { baseColor: '#6fa9c8', metalness: 0.0, roughness: 0.42 };

// Reference evidence from the original front-facing robot hand render. These
// landmarks describe visible proportions only; the clevis, pin, mate, and load
// code below completes the physically missing mechanism.
const referenceLandmarks = {
  palm: {
    width: 150,
    depth: 18,
    height: 96,
    centerZ: 17,
    baseZ: 76,
    darkWrist: { width: 132, height: 17, centerZ: -39 },
    lowerWrist: { width: 66, height: 28, centerZ: -59 },
    wristBlock: { width: 58, height: 34, centerZ: -87 },
    sidePods: [
      { x: -70, z: -55, width: 24, height: 32 },
      { x: 70, z: -55, width: 24, height: 32 },
    ],
    thumbShoulder: { x: 86, z: 16, width: 30, height: 56 },
  },
  actuatorWindows: [
    { x: -34, z: 24, width: 14, height: 32 },
    { x: 0, z: 30, width: 16, height: 30 },
    { x: 34, z: 24, width: 14, height: 32 },
    { x: -14, z: -14, width: 12, height: 25 },
    { x: 14, z: -14, width: 12, height: 25 },
  ],
  screws: [
    { x: -48, z: 53 }, { x: -31, z: 55 }, { x: -9, z: 49 }, { x: 9, z: 49 }, { x: 31, z: 55 }, { x: 48, z: 53 },
    { x: -48, z: -4 }, { x: 48, z: -4 }, { x: -38, z: -24 }, { x: 38, z: -24 }, { x: -20, z: 8 }, { x: 20, z: 8 },
  ],
  tendons: [
    { end: [-46, -67] },
    { end: [-27, -68] },
    { end: [-9, -70] },
    { end: [9, -70] },
    { end: [27, -68] },
    { end: [46, -67] },
  ],
  fingers: [
    { name: 'little', x: -62, lengths: [47, 35, 25], width: 13.0, angleDeg: -3, curl: [24, 34, 24], loads: [0.24, 0.16, 0.08] },
    { name: 'ring', x: -23, lengths: [55, 40, 28], width: 14.5, angleDeg: -1, curl: [28, 38, 28], loads: [0.30, 0.20, 0.10] },
    { name: 'middle', x: 18, lengths: [61, 44, 31], width: 15.0, angleDeg: 0, curl: [30, 40, 30], loads: [0.34, 0.23, 0.12] },
    { name: 'index', x: 58, lengths: [54, 39, 28], width: 14.0, angleDeg: 3, curl: [27, 38, 27], loads: [0.32, 0.21, 0.11] },
    { name: 'thumb', x: 108, mcpZ: 21, lengths: [37, 31, 24], width: 13.0, angleDeg: 38, curl: [22, 32, 24], loads: [0.28, 0.19, 0.10] },
  ],
};

const PALM_X = referenceLandmarks.palm.width;
const PALM_Y = referenceLandmarks.palm.depth;
const PALM_Z = referenceLandmarks.palm.height;
const PALM_FRONT_Y = -PALM_Y / 2;
const BASE_Z = referenceLandmarks.palm.baseZ;
const FINGER_Y = 12;
const HINGE_Y = PALM_FRONT_Y - FINGER_Y;
const PIP_PIVOT_OVERHANG = 8;
const DIP_PIVOT_OVERHANG = 7;

const graspTask = {
  id: 'power-cylinder-grasp',
  objectDiameterMm: 38,
  objectDepthMm: 34,
  holdForceN: 3,
  contactNormalForceN: 4,
};
const graspCylinderCenter = [104, HINGE_Y - 42, BASE_Z + 112];
const graspCylinderRadius = graspTask.objectDiameterMm / 2;

const mcpStyle = {
  knuckleR: 5.4,
  forkGapY: 28,
  tongueY: 5.2,
  plateT: 2.4,
  pinR: 1.3,
  pinCapR: 3.6,
  holeClearance: 0.45,
  forkMaterial,
  tongueMaterial,
  pinMaterial,
};
const pipStyle = {
  ...mcpStyle,
  knuckleR: 6.4,
  forkGapY: 28,
  tongueY: 6.8,
  plateT: 3.0,
  pinR: 1.6,
  pinCapR: 5.0,
  pinCapThickness: 4.2,
};
const dipStyle = {
  ...mcpStyle,
  knuckleR: 5.2,
  forkGapY: 23,
  tongueY: 4.0,
  plateT: 2.8,
  pinR: 0.9,
  pinCapR: 4.3,
  holeClearance: 0.35,
};

const supportedGraspMcpNames = ['middle', 'index', 'thumb'];
const palmConnectors = {};
const palmMountConnectors = {};
const assemblyTasks = [];
const mcpDriveTasks = [];

function plate(x, y, z, cx, cy, cz, material) {
  return box(x, y, z, true).translate(cx, cy, cz).material(material);
}

function pointAlong(angleDeg, distance) {
  const radians = angleDeg * Math.PI / 180;
  return [Math.sin(radians) * distance, 0, Math.cos(radians) * distance];
}

function linkRod(a, b, width, depth, material, y = PALM_FRONT_Y - 1.2) {
  const [x1, z1] = a;
  const [x2, z2] = b;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz) * 180 / Math.PI;
  return box(width, depth, len, true)
    .rotate([0, 1, 0], angle)
    .translate((x1 + x2) / 2, y, (z1 + z2) / 2)
    .material(material);
}

function screwHead(x, z, radius = 2.3) {
  return cylinder(4, radius, 18)
    .alongAxis([0, 1, 0])
    .translate(x, PALM_FRONT_Y - 1.8, z)
    .material(pinMaterial);
}

let palmGeometry = plate(PALM_X, PALM_Y, PALM_Z, 0, 0, referenceLandmarks.palm.centerZ, palmMaterial)
  .union(plate(referenceLandmarks.palm.darkWrist.width, PALM_Y + 2, referenceLandmarks.palm.darkWrist.height, 0, 0, referenceLandmarks.palm.darkWrist.centerZ, darkMaterial))
  .union(plate(referenceLandmarks.palm.lowerWrist.width, PALM_Y + 2, referenceLandmarks.palm.lowerWrist.height, 0, 0, referenceLandmarks.palm.lowerWrist.centerZ, { baseColor: '#55595d', metalness: 0, roughness: 0.5 }))
  .union(plate(referenceLandmarks.palm.wristBlock.width, PALM_Y + 4, referenceLandmarks.palm.wristBlock.height, 0, 0, referenceLandmarks.palm.wristBlock.centerZ, { baseColor: '#3b3e40', metalness: 0, roughness: 0.52 }))
  .union(plate(referenceLandmarks.palm.thumbShoulder.width, PALM_Y + 4, referenceLandmarks.palm.thumbShoulder.height, referenceLandmarks.palm.thumbShoulder.x, 0, referenceLandmarks.palm.thumbShoulder.z, palmMaterial));

for (const pod of referenceLandmarks.palm.sidePods) {
  palmGeometry = palmGeometry.union(plate(pod.width, PALM_Y + 4, pod.height, pod.x, 0, pod.z, darkMaterial));
}

// actuator window inserts are shallow overlaps into the palm face, not floating
// labels. The bright rods overlap the insert and palm so disconnected-solid
// review has real material continuity.
for (const windowSpec of referenceLandmarks.actuatorWindows) {
  const { x, z, width, height } = windowSpec;
  palmGeometry = palmGeometry
    .union(plate(width, 3.2, height, x, PALM_FRONT_Y - 1.0, z, darkMaterial))
    .union(linkRod([x - 2, z - height * 0.32], [x + 2, z + height * 0.32], 1.8, 3.6, pinMaterial));
}

for (const { x, z } of referenceLandmarks.screws) {
  palmGeometry = palmGeometry.union(screwHead(x, z));
}

for (const { end } of referenceLandmarks.tendons) {
  const [x, z] = end;
  palmGeometry = palmGeometry.union(linkRod([x * 0.40, -31], [x, z], 1.7, 3.6, pinMaterial));
}

function rootClearanceFor(width) {
  return Math.max(25, width + 10);
}

function orient(shape, angleDeg) {
  return angleDeg === 0 ? shape : shape.rotate([0, 1, 0], angleDeg, [0, 0, 0]);
}

function fingerLink(length, width, depth, material, angleDeg, rootClearance = rootClearanceFor(width)) {
  const neckStart = 5;
  const neckEnd = rootClearance + 2.5;
  const rootNeck = box(width * 0.80, depth * 0.82, neckEnd - neckStart, true)
    .translate(0, 0, (neckStart + neckEnd) / 2)
    .material(material);
  const core = box(width, depth, length, true)
    .translate(0, 0, rootClearance + length / 2)
    .material(material);
  const leftRail = box(width * 0.22, depth * 0.94, length * 0.70, true)
    .translate(-width * 0.34, 0, rootClearance + 5 + length * 0.36)
    .material(material);
  const rightRail = box(width * 0.22, depth * 0.94, length * 0.70, true)
    .translate(width * 0.34, 0, rootClearance + 5 + length * 0.36)
    .material(material);
  const actuatorWindow = box(width * 0.54, 3.4, length * 0.40, true)
    .translate(0, -depth / 2 - 1.1, rootClearance + length * 0.48)
    .material(darkMaterial);
  const actuatorRod = box(width * 0.10, 3.6, length * 0.62, true)
    .translate(0, -depth / 2 - 1.3, rootClearance + length * 0.47)
    .material(pinMaterial);
  return orient(rootNeck.union(core).union(leftRail).union(rightRail).union(actuatorWindow).union(actuatorRod), angleDeg);
}

function distalPad(length, width, depth, angleDeg) {
  const rootZ = dipStyle.knuckleR + 3;
  const contactPadOverlap = 3.0;
  const distalStructuralLen = length + 12;
  const contactPadLen = Math.max(10, length * 0.45);
  const structuralCenterZ = rootZ + distalStructuralLen / 2;
  const contactPadCenterZ = rootZ + distalStructuralLen - contactPadLen / 2 + contactPadOverlap / 2;
  const distalStructuralLink = box(width * 0.72, depth * 0.62, distalStructuralLen, true)
    .translate(0, 0, structuralCenterZ)
    .material(linkMaterial);
  const contactPad = box(width * 0.90, depth * 0.74, contactPadLen, true)
    .translate(0, 0, contactPadCenterZ)
    .material(tipMaterial)
    .union(
      box(width * 0.70, 2.8, contactPadLen * 0.74, true)
        .translate(0, -depth * 0.38, contactPadCenterZ + 1.0)
        .material({ baseColor: '#070b10', metalness: 0.0, roughness: 0.58 }),
    );
  return orient(distalStructuralLink.union(contactPad), angleDeg);
}

function axisConnector(connectorData) {
  return {
    type: 'axis',
    origin: { kind: 'vec3', value: connectorData.origin },
    axis: connectorData.axis,
    jointClearanceRadius: connectorData.clearanceRadius,
  };
}

function frameConnector(origin) {
  return {
    type: 'frame',
    origin: { kind: 'vec3', value: origin },
  };
}

function supportRevolute(mate, shaft, output, around) {
  hand.jointSupport(`${mate}-support`, {
    mate,
    shaft,
    supports: [shaft],
    output,
    requiredSupport: {
      kind: 'hinge-bracket',
      around,
      supports: [shaft],
      minBearingLengthMm: 6,
    },
  });
}

function addPalmConnector(name, clevisData) {
  palmConnectors[name] = {
    origin: clevisData.parentConnector.origin,
    axis: clevisData.parentConnector.axis,
    clearanceRadius: clevisData.parentConnector.clearanceRadius,
  };
  palmMountConnectors[`${name}Mount`] = clevisData.parentConnector.origin;
}

function addFinger(spec) {
  const [proxLen, midLen, distalLen] = spec.lengths;
  const [mcpMax, pipMax, dipMax] = spec.curl;
  const [mcpLoad, pipLoad, dipLoad] = spec.loads;
  const mcpZ = spec.mcpZ === undefined ? BASE_Z : spec.mcpZ;
  const proxRoot = rootClearanceFor(spec.width);
  const midRoot = rootClearanceFor(spec.width * 0.86);
  const straightPipPivot = [0, 0, proxRoot + proxLen + PIP_PIVOT_OVERHANG];
  const straightDipPivot = [0, 0, midRoot + midLen + DIP_PIVOT_OVERHANG];
  const straightTipFrame = [0, 0, dipStyle.knuckleR + 15 + distalLen];
  const pipPivot = spec.angleDeg === 0 ? straightPipPivot : pointAlong(spec.angleDeg, straightPipPivot[2]);
  const dipPivot = spec.angleDeg === 0 ? straightDipPivot : pointAlong(spec.angleDeg, straightDipPivot[2]);
  const tipFrame = spec.angleDeg === 0 ? straightTipFrame : pointAlong(spec.angleDeg, straightTipFrame[2]);

  const proximalRaw = fingerLink(proxLen, spec.width, FINGER_Y, linkMaterial, spec.angleDeg);
  const middleRaw = fingerLink(midLen, spec.width * 0.86, FINGER_Y * 0.90, linkMaterial, spec.angleDeg);
  const distalRaw = distalPad(distalLen, spec.width, FINGER_Y, spec.angleDeg);

  const mcp = joint.clevis({
    parentBody: palmGeometry,
    childBody: proximalRaw,
    axis: [1, 0, 0],
    pivotParent: [spec.x, HINGE_Y, mcpZ],
    pivotChild: [0, 0, 0],
    limitsDeg: [0, mcpMax],
    liftPivot: true,
    style: mcpStyle,
  });
  palmGeometry = mcp.parentGeometry;
  addPalmConnector(`${spec.name}Mcp`, mcp);
  if (supportedGraspMcpNames.includes(spec.name)) {
    const [mcpX, mcpY, mcpZLifted] = mcp.parentConnector.origin;
    const servoMountZ = mcpZLifted - (spec.name === 'thumb' ? 11 : 14);
    const servoPadDepth = 12;
    palmGeometry = palmGeometry.union(plate(
      16,
      servoPadDepth,
      10,
      mcpX,
      PALM_FRONT_Y - servoPadDepth / 2,
      servoMountZ,
      darkMaterial,
    ));
    palmMountConnectors[`${spec.name}McpServoMount`] = [
      mcpX,
      PALM_FRONT_Y - servoPadDepth,
      servoMountZ,
    ];
    void mcpY;
  }

  const pip = joint.clevis({
    parentBody: mcp.childGeometry,
    childBody: middleRaw,
    axis: [1, 0, 0],
    pivotParent: pipPivot,
    pivotChild: [0, 0, 0],
    limitsDeg: [0, pipMax],
    liftPivot: true,
    style: pipStyle,
  });

  const dip = joint.clevis({
    parentBody: pip.childGeometry,
    childBody: distalRaw,
    axis: [1, 0, 0],
    pivotParent: dipPivot,
    pivotChild: [0, 0, 0],
    limitsDeg: [0, dipMax],
    liftPivot: true,
    style: dipStyle,
  });

  assemblyTasks.push(() => {
    const proximal = hand
      .part(`${spec.name}-proximal`, pip.parentGeometry, { density: 1180 })
      .connector('mcp', axisConnector({
        origin: mcp.childConnector.origin,
        axis: mcp.childConnector.axis,
        clearanceRadius: mcp.childConnector.clearanceRadius,
      }))
      .connector('pip', axisConnector({
        origin: pip.parentConnector.origin,
        axis: pip.parentConnector.axis,
        clearanceRadius: pip.parentConnector.clearanceRadius,
      }));

    const middle = hand
      .part(`${spec.name}-middle`, dip.parentGeometry, { density: 1180 })
      .connector('pip', axisConnector({
        origin: pip.childConnector.origin,
        axis: pip.childConnector.axis,
        clearanceRadius: pip.childConnector.clearanceRadius,
      }))
      .connector('dip', axisConnector({
        origin: dip.parentConnector.origin,
        axis: dip.parentConnector.axis,
        clearanceRadius: dip.parentConnector.clearanceRadius,
      }));

    const distal = hand
      .part(`${spec.name}-distal`, dip.childGeometry, { density: 1180 })
      .connector('dip', axisConnector({
        origin: dip.childConnector.origin,
        axis: dip.childConnector.axis,
        clearanceRadius: dip.childConnector.clearanceRadius,
      }))
      .connector('tip-frame', {
        type: 'frame',
        origin: { kind: 'vec3', value: tipFrame },
      });

    hand.mate(`${spec.name}-mcp`, `palm-root.${spec.name}Mcp`, `${spec.name}-proximal.mcp`, 'revolute', {
      pose: closeDeg.multiply(mcpMax / 32),
      limitsDeg: [0, mcpMax],
      maxLoad: { torque: mcpLoad },
    });
    hand.mate(`${spec.name}-pip`, `${spec.name}-proximal.pip`, `${spec.name}-middle.pip`, 'revolute', {
      pose: closeDeg.multiply(pipMax / 42),
      limitsDeg: [0, pipMax],
      maxLoad: { torque: pipLoad },
    });
    hand.mate(`${spec.name}-dip`, `${spec.name}-middle.dip`, `${spec.name}-distal.dip`, 'revolute', {
      pose: closeDeg.multiply(dipMax / 34),
      limitsDeg: [0, dipMax],
      maxLoad: { torque: dipLoad },
    });

    if (!supportedGraspMcpNames.includes(spec.name)) {
      supportRevolute(`${spec.name}-mcp`, 'palm-root', `${spec.name}-proximal`, `palm-root.${spec.name}Mcp`);
    }
    supportRevolute(`${spec.name}-pip`, `${spec.name}-proximal`, `${spec.name}-middle`, `${spec.name}-proximal.pip`);
    supportRevolute(`${spec.name}-dip`, `${spec.name}-middle`, `${spec.name}-distal`, `${spec.name}-middle.dip`);

    if (supportedGraspMcpNames.includes(spec.name)) {
      mcpDriveTasks.push(() => {
        const servoName = `${spec.name}-mcp-servo`;

        hand
          .part(servoName,
            box(10, 20, 6, true)
              .translate(0, -10, 0)
              .union(box(20, 13, 16, true).translate(0, -25, 0))
              .union(cylinder(5, 4.5, 24).alongAxis([1, 0, 0]).translate(0, -32, 0))
              .material(darkMaterial),
            { density: 1350 },
          )
          .connector('mount', frameConnector([0, 0.8, 0]));

        hand.mate(`${spec.name}-mcp-servo-fix`, `palm-root.${spec.name}McpServoMount`, `${servoName}.mount`, 'fastened');
        hand.mechanicalJoint(`${spec.name}-mcp-drive`, {
          mate: `${spec.name}-mcp`,
          actuator: servoName,
          shaft: 'palm-root',
          supports: ['palm-root'],
          output: `${spec.name}-proximal`,
          requiredSupport: {
            kind: 'hinge-bracket',
            around: `palm-root.${spec.name}Mcp`,
            supports: ['palm-root'],
            minBearingLengthMm: 8,
          },
        });
      });
    }

    void proximal;
    void middle;
    void distal;
  });
}

referenceLandmarks.fingers.forEach(addFinger);

const palm = hand.part('palm-root', palmGeometry, { density: 1180 });
for (const [name, connectorData] of Object.entries(palmConnectors)) {
  palm.connector(name, axisConnector(connectorData));
}
for (const [name, origin] of Object.entries(palmMountConnectors)) {
  palm.connector(name, frameConnector(origin));
}
assemblyTasks.forEach((assemblyTask) => assemblyTask());
mcpDriveTasks.forEach((driveTask) => driveTask());

void palm;

const graspCylinder = hand.part('grasp-cylinder',
  cylinder(graspTask.objectDepthMm, graspCylinderRadius, 64)
    .alongAxis([0, 1, 0])
    .translate(graspCylinderCenter[0], graspCylinderCenter[1], graspCylinderCenter[2])
    .material(targetMaterial),
  { role: 'contact-target' },
);
graspCylinder
  .connector('thumb-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [graspCylinderCenter[0] + graspCylinderRadius, graspCylinderCenter[1], graspCylinderCenter[2] - 3] },
  })
  .connector('index-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [graspCylinderCenter[0] - graspCylinderRadius * 0.45, graspCylinderCenter[1], graspCylinderCenter[2] + 10] },
  })
  .connector('middle-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [graspCylinderCenter[0] - graspCylinderRadius * 0.65, graspCylinderCenter[1], graspCylinderCenter[2] - 10] },
  });

hand.physicalUseCase('power-cylinder-grasp', {
  stableParts: ['palm-root'],
  loads: [{ part: 'grasp-cylinder', force: [0, 0, -graspTask.holdForceN] }],
  contacts: [
    { a: 'grasp-cylinder.thumb-contact', b: 'thumb-distal.tip-frame', normal: [1, 0, 0], friction: 0.7, normalForceN: graspTask.contactNormalForceN },
    { a: 'grasp-cylinder.index-contact', b: 'index-distal.tip-frame', normal: [-1, 0, 0], friction: 0.7, normalForceN: graspTask.contactNormalForceN },
    { a: 'grasp-cylinder.middle-contact', b: 'middle-distal.tip-frame', normal: [-1, 0, 0], friction: 0.7, normalForceN: graspTask.contactNormalForceN },
  ],
  actuatorLimits: [
    { mate: 'thumb-mcp', maxTorqueNmm: 650 },
    { mate: 'index-mcp', maxTorqueNmm: 650 },
    { mate: 'middle-mcp', maxTorqueNmm: 650 },
  ],
  criteria: { maxSlipMm: 8, settleTimeMs: 500 },
});

return hand.solvedModel({}, {
  validate: 'error',
  externalLoads: {
    'little-proximal': { torque: [0.06, 0, 0] },
    'little-middle': { torque: [0.035, 0, 0] },
    'little-distal': { torque: [0.018, 0, 0] },
    'ring-proximal': { torque: [0.08, 0, 0] },
    'ring-middle': { torque: [0.045, 0, 0] },
    'ring-distal': { torque: [0.022, 0, 0] },
    'middle-proximal': { torque: [0.09, 0, 0] },
    'middle-middle': { torque: [0.05, 0, 0] },
    'middle-distal': { torque: [0.025, 0, 0] },
    'index-proximal': { torque: [0.085, 0, 0] },
    'index-middle': { torque: [0.046, 0, 0] },
    'index-distal': { torque: [0.023, 0, 0] },
    'thumb-proximal': { torque: [0.07, 0, 0] },
    'thumb-middle': { torque: [0.04, 0, 0] },
    'thumb-distal': { torque: [0.02, 0, 0] },
  },
});
