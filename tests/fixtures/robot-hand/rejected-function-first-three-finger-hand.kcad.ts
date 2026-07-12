// Function-first three-finger hand.
//
// This is a grasp testbed, not a visual hand copy. The model starts from one
// task: power-cylinder grasp. The target object is a free grasp target,
// and the three moving fingers use joint.clevis(...) so the revolute joints are
// drilled clearance joints instead of overlapping decorative blocks.

const gripDeg = param('gripDeg', 18, { min: 10, max: 36 });

setCameraTarget(0, 0, 18);
setCameraDistance(150);

const task = {
  id: 'power-cylinder',
  objectDiameterMm: 30.5,
  objectHeightMm: 30,
  requiredApertureMm: 44,
  contactNormalForceN: 3,
};

const targetR = task.objectDiameterMm / 2;
const rightContactY = 12;
const rightContactX = Math.sqrt(targetR * targetR - rightContactY * rightContactY);
const thumbContactY = 4.2;
const thumbContactX = -Math.sqrt(targetR * targetR - thumbContactY * thumbContactY);

const contactTargets = [
  { finger: 'thumb-finger', point: [thumbContactX, thumbContactY, 0], normal: [-1, 0, 0] },
  { finger: 'index-finger', point: [rightContactX, rightContactY, 0], normal: [1, 0, 0] },
  { finger: 'middle-finger', point: [rightContactX, -rightContactY, 0], normal: [1, 0, 0] },
];

const materialPalm = { baseColor: '#8d815d', metalness: 0.0, roughness: 0.55 };
const materialFinger = { baseColor: '#a5481f', metalness: 0.0, roughness: 0.50 };
const materialPad = { baseColor: '#262626', metalness: 0.0, roughness: 0.75 };
const materialTarget = { baseColor: '#80b8d8', metalness: 0.0, roughness: 0.45 };
const materialPin = { baseColor: '#c9ced1', metalness: 0.75, roughness: 0.28 };
const materialDriver = { baseColor: '#20282f', metalness: 0.25, roughness: 0.40 };

const palmT = 8;
const palmTop = palmT;
const clevisR = 7;
const thumbFingerLen = 23;
const opposingFingerLen = 29;
const fingerW = 8;
const fingerT = 6;
const padLen = 5;
const padW = 5;
const padT = 5;
const fingerRootClearance = clevisR + 15;
const driverAxis = [0, -26, palmTop + 8];
const targetMount = [0, 5.4, palmTop + 8];
const targetContactZ = targetMount[2];
const thumbHinge = [-63, 0, palmTop + 8];
const indexHinge = [63, 7, palmTop + 8];
const middleHinge = [63, -21, palmTop + 8];

const clevisStyle = {
  knuckleR: clevisR,
  forkGapY: 10,
  tongueY: 8,
  plateT: 2.0,
  pinR: 1.2,
  pinCapR: 3.6,
  holeClearance: 1.0,
  forkMaterial: materialPalm,
  tongueMaterial: materialFinger,
  pinMaterial: materialPin,
};

function fingerReach(len) {
  return fingerRootClearance + len;
}

function fingerContactReach(len) {
  return fingerReach(len);
}

function fingerBody(name, dir, len) {
  const rootStartX = clevisR;
  const rootLen = fingerRootClearance + 2 - rootStartX;
  const proximalLen = len * 0.48;
  const distalLen = len * 0.34;
  const segmentGap = 2.2;
  const proximalCenterX = dir * (fingerRootClearance + proximalLen / 2);
  const distalCenterX = dir * (fingerRootClearance + proximalLen + segmentGap + distalLen / 2);
  const spineLen = len - padLen;
  const spineCenterX = dir * (fingerRootClearance + spineLen / 2);
  const padCenterX = dir * (fingerRootClearance + len - padLen / 2);
  const knuckleBossX = dir * (fingerRootClearance + proximalLen + segmentGap / 2);

  const rootShank = box(rootLen, 6, 4, true)
    .translate(dir * (rootStartX + rootLen / 2), 0, 0);
  const proximalLink = box(proximalLen, fingerW, fingerT, true)
    .translate(proximalCenterX, 0, 0);
  const distalLink = box(distalLen, fingerW - 1.5, fingerT - 0.6, true)
    .translate(distalCenterX, 0, 0);
  const dorsalSpine = box(spineLen, 3.2, 3.2, true)
    .translate(spineCenterX, 0, 0.4);
  const knuckleBoss = box(5.6, 12, 5.8, true)
    .translate(knuckleBossX, 0, 0)
    .material(materialFinger);
  const contactPad = box(padLen, padW, padT, true)
    .translate(padCenterX, 0, 0)
    .material(materialPad);

  return rootShank
    .union(proximalLink)
    .union(distalLink)
    .union(dorsalSpine)
    .union(knuckleBoss)
    .union(contactPad)
    .material(materialFinger);
}

function palmShell() {
  const wristCuff = box(28, 44, palmT, true).translate(-48, -16, palmT / 2);
  const metacarpalBridge = box(86, 46, palmT, true).translate(12, -4, palmT / 2);
  const thumbSaddle = box(28, 24, palmT + 2, true).translate(-50, 12, palmT / 2 + 1);
  const indexKnuckleBoss = box(22, 14, palmT + 3, true).translate(indexHinge[0] - 4, indexHinge[1], palmT / 2 + 1.5);
  const middleKnuckleBoss = box(22, 14, palmT + 3, true).translate(middleHinge[0] - 4, middleHinge[1], palmT / 2 + 1.5);
  const dorsalRib = box(68, 5, 4, true).translate(8, -28, palmTop + 2);
  return wristCuff
    .union(metacarpalBridge)
    .union(thumbSaddle)
    .union(indexKnuckleBoss)
    .union(middleKnuckleBoss)
    .union(dorsalRib)
    .material(materialPalm);
}

function axisConnector(connectorSpec) {
  return {
    type: 'axis',
    origin: { kind: 'vec3', value: connectorSpec.origin },
    axis: connectorSpec.axis,
    jointClearanceRadius: connectorSpec.clearanceRadius,
  };
}

let palmGeometry = palmShell()
  .union(box(22, 16, 8, true).translate(driverAxis[0], driverAxis[1], palmTop + 4))
  .material(materialPalm);

const thumbClevis = joint.clevis({
  parentBody: palmGeometry,
  childBody: fingerBody('thumb-finger', 1, thumbFingerLen),
  axis: 'Z',
  pivotParent: thumbHinge,
  pivotChild: [0, 0, 0],
  limitsDeg: [6, 36],
  liftDir: [0, 1, 0],
  style: clevisStyle,
});
palmGeometry = thumbClevis.parentGeometry;

const indexClevis = joint.clevis({
  parentBody: palmGeometry,
  childBody: fingerBody('index-finger', -1, opposingFingerLen),
  axis: 'Z',
  pivotParent: indexHinge,
  pivotChild: [0, 0, 0],
  limitsDeg: [-36, -10],
  liftDir: [0, 1, 0],
  style: clevisStyle,
});
palmGeometry = indexClevis.parentGeometry;

const middleClevis = joint.clevis({
  parentBody: palmGeometry,
  childBody: fingerBody('middle-finger', -1, opposingFingerLen),
  axis: 'Z',
  pivotParent: middleHinge,
  pivotChild: [0, 0, 0],
  limitsDeg: [-36, -6],
  liftDir: [0, 1, 0],
  style: clevisStyle,
});
palmGeometry = middleClevis.parentGeometry;

const hand = assembly('function-first three-finger grasp testbed');

const palm = hand.part('palm', palmGeometry);
palm
  .connector('driver', {
    type: 'axis',
    origin: { kind: 'vec3', value: driverAxis },
    axis: [0, 0, 1],
  })
  .connector('target-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: targetMount },
  })
  .connector('thumb-hinge', axisConnector(thumbClevis.parentConnector))
  .connector('index-hinge', axisConnector(indexClevis.parentConnector))
  .connector('middle-hinge', axisConnector(middleClevis.parentConnector));

const targetCylinder = hand.part(
  'target-cylinder',
  cylinder(task.objectHeightMm, task.objectDiameterMm / 2, 48)
    .translate(targetMount[0], targetMount[1], palmTop + 1)
    .material(materialTarget),
);
targetCylinder.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: targetMount },
})
  .connector('thumb-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [targetMount[0] + thumbContactX, targetMount[1] + thumbContactY, targetContactZ] },
  })
  .connector('index-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [targetMount[0] + rightContactX, targetMount[1] + rightContactY, targetContactZ] },
  })
  .connector('middle-contact', {
    type: 'frame',
    origin: { kind: 'vec3', value: [targetMount[0] + rightContactX, targetMount[1] - rightContactY, targetContactZ] },
  });

const gripDriver = hand.part(
  'grip-driver',
  cylinder(5, 5, 28)
    .material(materialDriver),
);
gripDriver.connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

const thumbFinger = hand.part('thumb-finger', thumbClevis.childGeometry);
thumbFinger
  .connector('hinge', axisConnector(thumbClevis.childConnector))
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerContactReach(thumbFingerLen), 0, 0] },
  })
  .connector('contact-normal', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerContactReach(thumbFingerLen), 0, 0] },
  });

const indexFinger = hand.part('index-finger', indexClevis.childGeometry);
indexFinger
  .connector('hinge', axisConnector(indexClevis.childConnector))
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-fingerContactReach(opposingFingerLen), 0, 0] },
  })
  .connector('contact-normal', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-fingerContactReach(opposingFingerLen), 0, 0] },
  });

const middleFinger = hand.part('middle-finger', middleClevis.childGeometry);
middleFinger
  .connector('hinge', axisConnector(middleClevis.childConnector))
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-fingerContactReach(opposingFingerLen), 0, 0] },
  })
  .connector('contact-normal', {
    type: 'frame',
    origin: { kind: 'vec3', value: [-fingerContactReach(opposingFingerLen), 0, 0] },
  });

hand.mate('grip', 'palm.driver', 'grip-driver.axis', 'revolute', {
  pose: gripDeg,
  limitsDeg: [10, 36],
});
hand.mate('thumb-curl', 'palm.thumb-hinge', 'thumb-finger.hinge', 'revolute', { pose: 18, limitsDeg: [6, 36] });
hand.mate('index-curl', 'palm.index-hinge', 'index-finger.hinge', 'revolute', { pose: -18, limitsDeg: [-36, -10] });
hand.mate('middle-curl', 'palm.middle-hinge', 'middle-finger.hinge', 'revolute', { pose: -6, limitsDeg: [-36, -6] });

hand.coupleMates('thumb-curl', { source: 'grip', ratio: 1 });
hand.coupleMates('index-curl', { source: 'grip', ratio: -1 });
hand.coupleMates('middle-curl', { source: 'grip', ratio: -1 });

hand.transmission('thumb-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['thumb-curl'],
  actuator: 'grip-driver',
  input: 'grip-driver',
  output: 'thumb-finger',
  path: ['grip-driver', 'palm', 'thumb-finger'],
  ratio: 1,
  notes: `Task ${task.id}: drive thumb toward cylinder contact normal ${contactTargets[0].normal.join(',')}.`,
});
hand.transmission('index-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['index-curl'],
  actuator: 'grip-driver',
  input: 'grip-driver',
  output: 'index-finger',
  path: ['grip-driver', 'palm', 'index-finger'],
  ratio: -1,
  notes: `Task ${task.id}: drive index toward cylinder contact normal ${contactTargets[1].normal.join(',')}.`,
});
hand.transmission('middle-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['middle-curl'],
  actuator: 'grip-driver',
  input: 'grip-driver',
  output: 'middle-finger',
  path: ['grip-driver', 'palm', 'middle-finger'],
  ratio: -1,
  notes: `Task ${task.id}: drive middle toward cylinder contact normal ${contactTargets[2].normal.join(',')}.`,
});

hand.physicalUseCase('power-cylinder-grasp', {
  stableParts: ['target-cylinder'],
  loads: [{ part: 'target-cylinder', force: [0, 0, -4] }],
  contacts: [
    { a: 'thumb-finger.tip', b: 'target-cylinder.thumb-contact', normal: [-1, 0, 0], friction: 0.7, normalForceN: task.contactNormalForceN },
    { a: 'index-finger.tip', b: 'target-cylinder.index-contact', normal: [1, 0, 0], friction: 0.7, normalForceN: task.contactNormalForceN },
    { a: 'middle-finger.tip', b: 'target-cylinder.middle-contact', normal: [1, 0, 0], friction: 0.7, normalForceN: task.contactNormalForceN },
  ],
  actuatorLimits: [{ mate: 'grip', maxTorqueNmm: 180 }],
  criteria: { maxSlipMm: 5, settleTimeMs: 500 },
});

return hand.solvedModel({}, {
  validate: 'warn',
  ignore: [
    ['palm', 'thumb-finger'],
    ['palm', 'index-finger'],
    ['palm', 'middle-finger'],
  ],
});
