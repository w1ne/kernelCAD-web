// Functional robot-hand pilot built by the mechanism-first workflow.
//
// This file is intentionally module-first: one index finger is physically
// realized with clevis/pin revolute joints before the topology is replicated
// across a whole hand. Image/mesh evidence can refine the shell later; the
// acceptance authority here is review_cad.

const closeDeg = param('closeDeg', 0, { min: 0, max: 28 });

setCameraTarget(55, 0, 18);
setCameraDistance(210);

const hand = assembly('functional-clevis-robot-hand');

const palmMaterial = { baseColor: '#8d9088', metalness: 0.0, roughness: 0.58 };
const linkMaterial = { baseColor: '#c8c4ba', metalness: 0.0, roughness: 0.48 };
const tipMaterial = { baseColor: '#24282c', metalness: 0.0, roughness: 0.62 };
const forkMaterial = { baseColor: '#6f7378', metalness: 0.0, roughness: 0.45 };
const tongueMaterial = { baseColor: '#b8b2a5', metalness: 0.0, roughness: 0.45 };
const pinMaterial = { baseColor: '#d6d9dc', metalness: 0.8, roughness: 0.22 };

const clevisStyle = {
  knuckleR: 7,
  forkGapY: 15,
  tongueY: 11,
  plateT: 2.8,
  pinR: 1.8,
  pinCapR: 3.2,
  holeClearance: 0.25,
  forkMaterial,
  tongueMaterial,
  pinMaterial,
};

const PALM_X = 34;
const PALM_Y = 48;
const PALM_Z = 26;
const FINGER_Y = 11;
const FINGER_Z = 12;

function fingerLink(length: number, width: number, height: number, material: typeof linkMaterial, rootClearanceOverride?: number) {
  const rootClearance = rootClearanceOverride ?? Math.max(13, width + 3);
  const neckStart = 5.5;
  const neckEnd = rootClearance + 3;
  const rootNeck = box(neckEnd - neckStart, width * 0.9, height * 0.8, true)
    .translate((neckStart + neckEnd) / 2, 0, 0)
    .material(material);
  const core = box(length, width, height, true)
    .translate(rootClearance + length / 2, 0, 0)
    .material(material);
  const dorsalRail = box(length * 0.72, 2.4, 2.4, true)
    .translate(rootClearance + 3 + length * 0.42, 0, height / 2 + 0.35)
    .material({ baseColor: '#5b6066', metalness: 0.0, roughness: 0.55 });
  const railWeb = box(length * 0.58, 1.5, 2.0, true)
    .translate(rootClearance + 5 + length * 0.36, 0, height / 2 - 0.45)
    .material(material);
  return rootNeck.union(core).union(railWeb).union(dorsalRail);
}

function outboardForkBridges(
  xCenter: number,
  xLength: number,
  yCenter: number,
  yWidth: number,
  zCenter: number,
  zHeight: number,
  material: typeof linkMaterial,
) {
  const right = box(xLength, yWidth, zHeight, true)
    .translate(xCenter, yCenter, zCenter)
    .material(material);
  const left = box(xLength, yWidth, zHeight, true)
    .translate(xCenter, -yCenter, zCenter)
    .material(material);
  return right.union(left);
}

const palmRaw = box(PALM_X, PALM_Y, PALM_Z, true)
  .translate(0, 0, 0)
  .material(palmMaterial)
  .union(
    box(20, 20, 14, true)
      .translate(PALM_X / 2 + 5, 0, 0)
      .material({ baseColor: '#777b80', metalness: 0.0, roughness: 0.5 }),
  );

const pipStyle = {
  ...clevisStyle,
  knuckleR: 6.4,
  forkGapY: 18,
  tongueY: 8,
  plateT: 3.2,
  pinR: 1.6,
  pinCapR: 3.4,
  pinCapThickness: 4.5,
};
const dipStyle = {
  ...clevisStyle,
  knuckleR: 5.2,
  forkGapY: 8,
  tongueY: 4.2,
  plateT: 3.0,
  pinR: 0.8,
  pinCapR: 3.2,
  holeClearance: 0.4,
};

const proximalRaw = fingerLink(49, FINGER_Y, FINGER_Z, linkMaterial)
  .union(outboardForkBridges(50, 8, 7.7, 5.0, 1.8, 8.0, linkMaterial));
const middleRaw = fingerLink(36.5, FINGER_Y * 0.88, FINGER_Z * 0.88, linkMaterial);
const distalRaw = box(26, 5.2, FINGER_Z * 0.68, true)
  .translate(dipStyle.knuckleR + 13, 0, 0)
  .material(tipMaterial)
  .union(
    box(20, 2.4, 2.4, true)
      .translate(dipStyle.knuckleR + 15, 0, FINGER_Z * 0.34 + 0.35)
      .material({ baseColor: '#070b10', metalness: 0.0, roughness: 0.58 }),
  )
  .union(
    box(18, 1.4, 1.8, true)
      .translate(dipStyle.knuckleR + 15, 0, FINGER_Z * 0.34 - 0.45)
      .material(tipMaterial),
  );

const mcp = joint.clevis({
  parentBody: palmRaw,
  childBody: proximalRaw,
  axis: [0, -1, 0],
  pivotParent: [PALM_X / 2 + 11, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [0, 34],
  liftPivot: true,
  style: clevisStyle,
});

const pip = joint.clevis({
  parentBody: mcp.childGeometry,
  childBody: middleRaw,
  axis: [0, -1, 0],
  pivotParent: [59, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [0, 42],
  liftPivot: true,
  style: pipStyle,
});

const dip = joint.clevis({
  parentBody: pip.childGeometry,
  childBody: distalRaw,
  axis: [0, -1, 0],
  pivotParent: [49, 0, 0],
  pivotChild: [0, 0, 0],
  limitsDeg: [0, 32],
  liftPivot: true,
  style: dipStyle,
});

const palm = hand
  .part('palm', mcp.parentGeometry, { density: 1180 })
  .connector('indexMcp', {
    type: 'axis',
    origin: { kind: 'vec3', value: mcp.parentConnector.origin },
    axis: mcp.parentConnector.axis,
    jointClearanceRadius: mcp.parentConnector.clearanceRadius,
  });

const proximal = hand
  .part('index-proximal', pip.parentGeometry, { density: 1180 })
  .connector('mcp', {
    type: 'axis',
    origin: { kind: 'vec3', value: mcp.childConnector.origin },
    axis: mcp.childConnector.axis,
    jointClearanceRadius: mcp.childConnector.clearanceRadius,
  })
  .connector('pip', {
    type: 'axis',
    origin: { kind: 'vec3', value: pip.parentConnector.origin },
    axis: pip.parentConnector.axis,
    jointClearanceRadius: pip.parentConnector.clearanceRadius,
  });

const middle = hand
  .part('index-middle', dip.parentGeometry, { density: 1180 })
  .connector('pip', {
    type: 'axis',
    origin: { kind: 'vec3', value: pip.childConnector.origin },
    axis: pip.childConnector.axis,
    jointClearanceRadius: pip.childConnector.clearanceRadius,
  })
  .connector('dip', {
    type: 'axis',
    origin: { kind: 'vec3', value: dip.parentConnector.origin },
    axis: dip.parentConnector.axis,
    jointClearanceRadius: dip.parentConnector.clearanceRadius,
  });

const distal = hand
  .part('index-distal', dip.childGeometry, { density: 1180 })
  .connector('dip', {
    type: 'axis',
    origin: { kind: 'vec3', value: dip.childConnector.origin },
    axis: dip.childConnector.axis,
    jointClearanceRadius: dip.childConnector.clearanceRadius,
  })
  .connector('tip-frame', {
    type: 'frame',
    origin: { kind: 'vec3', value: [37, 0, 0] },
  });

hand.mate('index-mcp', 'palm.indexMcp', 'index-proximal.mcp', 'revolute', {
  pose: closeDeg,
  limitsDeg: [0, 34],
  maxLoad: { torque: 0.35 },
});
hand.mate('index-pip', 'index-proximal.pip', 'index-middle.pip', 'revolute', {
  pose: closeDeg.multiply(0.82),
  limitsDeg: [0, 42],
  maxLoad: { torque: 0.24 },
});
hand.mate('index-dip', 'index-middle.dip', 'index-distal.dip', 'revolute', {
  pose: closeDeg.multiply(0.56),
  limitsDeg: [0, 32],
  maxLoad: { torque: 0.12 },
});

hand.jointSupport('index-mcp-support', {
  mate: 'index-mcp',
  shaft: 'palm',
  supports: ['palm'],
  output: 'index-proximal',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'palm.indexMcp',
    supports: ['palm'],
    minBearingLengthMm: 6,
  },
});
hand.jointSupport('index-pip-support', {
  mate: 'index-pip',
  shaft: 'index-proximal',
  supports: ['index-proximal'],
  output: 'index-middle',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'index-proximal.pip',
    supports: ['index-proximal'],
    minBearingLengthMm: 6,
  },
});
hand.jointSupport('index-dip-support', {
  mate: 'index-dip',
  shaft: 'index-middle',
  supports: ['index-middle'],
  output: 'index-distal',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'index-middle.dip',
    supports: ['index-middle'],
    minBearingLengthMm: 6,
  },
});

void palm;
void proximal;
void middle;
void distal;

return hand.solvedModel({}, {
  validate: 'error',
  externalLoads: {
    'index-proximal': { torque: [0, 0.12, 0] },
    'index-middle': { torque: [0, 0.06, 0] },
    'index-distal': { torque: [0, 0.03, 0] },
  },
});
