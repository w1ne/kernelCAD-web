// Function-first bar grasp skeleton.
//
// This is deliberately not a finished hand render. It is a minimal mechanism
// whose first contract is: three fingertips can reach declared contacts on a
// horizontal bar, with supported joints and a declared physical use case.

const gripDeg = param('gripDeg', 0, { min: 0, max: 24 });

setCameraTarget(0, 0, 12);
setCameraDistance(150);

const hand = assembly('function-first bar-grasp skeleton');

const materialPalm = { baseColor: '#7b7f83', metalness: 0.0, roughness: 0.48 };
const materialFinger = { baseColor: '#d1c7ad', metalness: 0.0, roughness: 0.50 };
const materialPad = { baseColor: '#1f2327', metalness: 0.0, roughness: 0.72 };
const materialTarget = { baseColor: '#78aeca', metalness: 0.0, roughness: 0.42 };
const materialDriver = { baseColor: '#2b333b', metalness: 0.25, roughness: 0.42 };

const task = {
  id: 'bar-grasp',
  barRadiusMm: 8,
  barLengthMm: 72,
  holdForceN: 4,
  contactNormalForceN: 3.5,
};

const palmZ = 10;
const hingeGapY = 42;
const fingerReach = hingeGapY - task.barRadiusMm;
const fingerThickness = 5;
const fingerWidth = 7;
const padLen = 6;
const driverAxis = [-42, 0, palmZ];
const actuatorMount = [-42, -20, palmZ];
const frameMount = [-42, 42, palmZ];
const barCenter = [0, 0, palmZ];

const contactTargets = [
  { finger: 'thumb-finger', connector: 'thumb-contact', point: [0, -task.barRadiusMm, palmZ], normal: [0, -1, 0] },
  { finger: 'index-finger', connector: 'index-contact', point: [-20, task.barRadiusMm, palmZ], normal: [0, 1, 0] },
  { finger: 'middle-finger', connector: 'middle-contact', point: [20, task.barRadiusMm, palmZ], normal: [0, 1, 0] },
];

function frame(origin) {
  return {
    type: 'frame',
    origin: { kind: 'vec3', value: origin },
  };
}

function axis(origin) {
  return {
    type: 'axis',
    origin: { kind: 'vec3', value: origin },
    axis: [0, 0, 1],
    jointClearanceRadius: 2.2,
  };
}

function fingerBody(name, direction) {
  const padY = direction * (fingerReach - padLen / 2);
  const hingeBoss = cylinder(fingerThickness + 2, 4.5, 24)
    .translate(0, 0, 0)
    .material(materialFinger);
  return hingeBoss
    .union(box(fingerWidth, fingerReach, fingerThickness, true)
    .translate(0, direction * fingerReach / 2, 0)
    .material(materialFinger))
    .union(
      box(fingerWidth + 3, padLen, fingerThickness + 1, true)
        .translate(0, padY, 0)
        .material(materialPad),
    );
}

const palm = hand.part(
  'palm',
  box(88, 100, 8, true)
    .translate(0, 0, palmZ - 4)
    .material(materialPalm)
    .union(box(18, 18, 12, true).translate(driverAxis[0], driverAxis[1], palmZ).material(materialDriver)),
);
palm
  .connector('driver', axis(driverAxis))
  .connector('actuator-mount', frame(actuatorMount))
  .connector('frame-mount', frame(frameMount))
  .connector('thumb-hinge', axis([0, -hingeGapY, palmZ]))
  .connector('index-hinge', axis([-20, hingeGapY, palmZ]))
  .connector('middle-hinge', axis([20, hingeGapY, palmZ]));

const frameBase = hand.part(
  'frame-base',
  box(16, 16, 10, true)
    .translate(frameMount[0], frameMount[1], frameMount[2])
    .material(materialPalm),
);
frameBase.connector('mount', frame(frameMount));

const targetBar = hand.part(
  'target-bar',
  cylinder(task.barLengthMm, task.barRadiusMm, 48)
    .alongAxis([1, 0, 0])
    .translate(barCenter[0], barCenter[1], barCenter[2])
    .material(materialTarget),
  { role: 'contact-target' },
);
targetBar
  .connector('load-point', frame(barCenter))
  .connector('thumb-contact', frame(contactTargets[0].point))
  .connector('index-contact', frame(contactTargets[1].point))
  .connector('middle-contact', frame(contactTargets[2].point));

const gripDriver = hand.part(
  'grip-driver',
  cylinder(8, 5, 28)
    .translate(driverAxis[0], driverAxis[1], driverAxis[2])
    .material(materialDriver),
);
gripDriver.connector('axis', axis(driverAxis));

const gripActuator = hand.part(
  'grip-actuator',
  box(16, 18, 12, true)
    .translate(actuatorMount[0], actuatorMount[1], actuatorMount[2])
    .material(materialDriver),
);
gripActuator.connector('mount', frame(actuatorMount));

const thumbFinger = hand.part('thumb-finger', fingerBody('thumb-finger', 1));
thumbFinger
  .connector('hinge', axis([0, 0, 0]))
  .connector('tip', frame([0, fingerReach, 0]));

const indexFinger = hand.part('index-finger', fingerBody('index-finger', -1));
indexFinger
  .connector('hinge', axis([0, 0, 0]))
  .connector('tip', frame([0, -fingerReach, 0]));

const middleFinger = hand.part('middle-finger', fingerBody('middle-finger', -1));
middleFinger
  .connector('hinge', axis([0, 0, 0]))
  .connector('tip', frame([0, -fingerReach, 0]));

hand.mate('grip', 'palm.driver', 'grip-driver.axis', 'revolute', {
  pose: gripDeg,
  limitsDeg: [0, 24],
});
hand.mate('palm-frame-fix', 'frame-base.mount', 'palm.frame-mount', 'fastened');
hand.mate('grip-actuator-fix', 'palm.actuator-mount', 'grip-actuator.mount', 'fastened');
hand.mate('thumb-curl', 'palm.thumb-hinge', 'thumb-finger.hinge', 'revolute', {
  pose: 0,
  limitsDeg: [0, 24],
});
hand.mate('index-curl', 'palm.index-hinge', 'index-finger.hinge', 'revolute', {
  pose: 0,
  limitsDeg: [-24, 0],
});
hand.mate('middle-curl', 'palm.middle-hinge', 'middle-finger.hinge', 'revolute', {
  pose: 0,
  limitsDeg: [-24, 0],
});

hand.coupleMates('thumb-curl', { source: 'grip', ratio: 1 });
hand.coupleMates('index-curl', { source: 'grip', ratio: -1 });
hand.coupleMates('middle-curl', { source: 'grip', ratio: -1 });

hand.jointSupport('thumb-curl-support', {
  mate: 'thumb-curl',
  shaft: 'palm',
  supports: ['palm'],
  output: 'thumb-finger',
  requiredSupport: { kind: 'hinge-bracket', around: 'palm.thumb-hinge', supports: ['palm'], minBearingLengthMm: 6 },
});
hand.jointSupport('index-curl-support', {
  mate: 'index-curl',
  shaft: 'palm',
  supports: ['palm'],
  output: 'index-finger',
  requiredSupport: { kind: 'hinge-bracket', around: 'palm.index-hinge', supports: ['palm'], minBearingLengthMm: 6 },
});
hand.jointSupport('middle-curl-support', {
  mate: 'middle-curl',
  shaft: 'palm',
  supports: ['palm'],
  output: 'middle-finger',
  requiredSupport: { kind: 'hinge-bracket', around: 'palm.middle-hinge', supports: ['palm'], minBearingLengthMm: 6 },
});

hand.mechanicalJoint('grip-drive-support', {
  mate: 'grip',
  actuator: 'grip-actuator',
  shaft: 'palm',
  supports: ['palm'],
  output: 'grip-driver',
  requiredSupport: { kind: 'hinge-bracket', around: 'palm.driver', supports: ['palm'], minBearingLengthMm: 6 },
});

hand.transmission('thumb-drive-linkage', {
  kind: 'direct-horn',
  sourceMate: 'grip',
  drivenMates: ['thumb-curl'],
  actuator: 'grip-actuator',
  input: 'grip-driver',
  output: 'thumb-finger',
  path: ['grip-driver', 'palm', 'thumb-finger'],
  ratio: 1,
});
hand.transmission('index-drive-linkage', {
  kind: 'direct-horn',
  sourceMate: 'grip',
  drivenMates: ['index-curl'],
  actuator: 'grip-actuator',
  input: 'grip-driver',
  output: 'index-finger',
  path: ['grip-driver', 'palm', 'index-finger'],
  ratio: -1,
});
hand.transmission('middle-drive-linkage', {
  kind: 'direct-horn',
  sourceMate: 'grip',
  drivenMates: ['middle-curl'],
  actuator: 'grip-actuator',
  input: 'grip-driver',
  output: 'middle-finger',
  path: ['grip-driver', 'palm', 'middle-finger'],
  ratio: -1,
});

hand.physicalUseCase('bar-grasp', {
  stableParts: ['palm'],
  loads: [{ part: 'target-bar', at: 'target-bar.load-point', force: [0, 0, -task.holdForceN] }],
  contacts: [
    { a: 'thumb-finger.tip', b: 'target-bar.thumb-contact', normal: contactTargets[0].normal, friction: 0.75, normalForceN: task.contactNormalForceN },
    { a: 'index-finger.tip', b: 'target-bar.index-contact', normal: contactTargets[1].normal, friction: 0.75, normalForceN: task.contactNormalForceN },
    { a: 'middle-finger.tip', b: 'target-bar.middle-contact', normal: contactTargets[2].normal, friction: 0.75, normalForceN: task.contactNormalForceN },
  ],
  actuatorLimits: [{ mate: 'grip', maxTorqueNmm: 220 }],
  criteria: { maxSlipMm: 1, settleTimeMs: 400 },
});

return hand.solvedModel({}, {
  validate: 'warn',
  ignore: [
    ['palm', 'thumb-finger'],
    ['palm', 'index-finger'],
    ['palm', 'middle-finger'],
    ['palm', 'grip-driver'],
    ['palm', 'grip-actuator'],
    ['palm', 'frame-base'],
  ],
});
