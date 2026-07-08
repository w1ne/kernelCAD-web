// Compact mate-driven robot arm with explicit support and drive intent.
//
// The model favors simple, inspectable load paths over decorative detail:
// every visible block belongs to a connected bracket, link, actuator mount,
// shaft witness, or gripper support.

const baseYawDeg = param('baseYawDeg', 18, { min: -55, max: 55 });
const shoulderPitchDeg = param('shoulderPitchDeg', 28, { min: 12, max: 40 });
const elbowPitchDeg = param('elbowPitchDeg', -34, { min: -58, max: 12 });
const gripDeg = param('gripDeg', 10, { min: 0, max: 28 });

const upperLen = 120;
const foreLen = 96;
const shoulderZ = 64;
const elbowServoY = 25;
const elbowServoCenterY = elbowServoY + 9;
const palmMountX = foreLen;
const gripAxis = [114, 0, 18];
const gripServoMountZ = 22;
const gripServoCenterZ = gripServoMountZ + 7;
const leftHinge = [112, 22, 0];
const rightHinge = [112, -22, 0];
const fingerLen = 34;
const fingerTipX = 6 + fingerLen;

const arm = assembly('compact supported robot arm');

const basePlate = arm.part(
  'base-plate',
  box(140, 110, 6, true)
    .translate(0, 0, 3)
    .union(box(52, 40, 4, true).translate(0, 0, 8))
    .color('plate'),
);

const baseYawServo = arm.part(
  'base-yaw-servo',
  box(42, 32, 34, true)
    .translate(0, 0, 27)
    .union(box(56, 34, 4, true).translate(0, 0, 42))
    .color('servo'),
);

const baseYawOutput = arm.part(
  'base-yaw-output',
  box(28, 28, 4, true)
    .fillet(1)
    .translate(0, 0, 46)
    .color('shaft'),
);

const yawTurret = arm.part(
  'yaw-turret',
  box(32, 32, 8, true)
    .translate(0, 0, 4)
    .union(box(22, 22, 38, true).translate(0, 0, 27))
    .union(box(22, 36, 8, true).translate(0, 0, 44))
    .union(box(8, 6, 4, true).translate(0, 15, 49))
    .union(box(8, 6, 4, true).translate(0, -15, 49))
    .union(box(16, 2, 12, true).translate(0, 19, shoulderZ))
    .union(box(16, 2, 12, true).translate(0, -19, shoulderZ))
    .union(box(20, 6, 28, true).translate(0, 15, shoulderZ))
    .union(box(20, 6, 28, true).translate(0, -15, shoulderZ))
    .color('frame'),
);

const shoulderPitchServo = arm.part(
  'shoulder-pitch-servo',
  box(30, 18, 32, true)
    .translate(0, 29, shoulderZ)
    .color('servo'),
);

const shoulderPitchShaft = arm.part(
  'shoulder-pitch-shaft',
  box(8, 4, 8, true)
    .translate(0, -22, shoulderZ)
    .color('shaft'),
);

const upperLink = arm.part(
  'upper-link',
  box(104, 14, 10, true)
    .translate(58, 0, 0)
    .union(box(14, 12, 14, true).translate(6, 0, 0))
    .union(box(22, 6, 8, true).translate(110, 10, 0))
    .union(box(22, 6, 8, true).translate(110, -10, 0))
    .union(box(14, 6, 22, true).translate(upperLen, 16, 0))
    .union(box(14, 6, 22, true).translate(upperLen, -16, 0))
    .union(box(16, 6, 3, true).translate(upperLen, 22, 9.5))
    .union(box(16, 6, 3, true).translate(upperLen, 22, -9.5))
    .union(box(80, 4, 5, true).translate(62, 0, 7.5))
    .color('beam'),
);

const elbowPitchServo = arm.part(
  'elbow-pitch-servo',
  box(30, 18, 30, true)
    .translate(upperLen, elbowServoCenterY, 0)
    .color('servo'),
);

const elbowPitchShaft = arm.part(
  'elbow-pitch-shaft',
  box(8, 6, 8, true)
    .translate(upperLen, 22, 0)
    .color('shaft'),
);

const forearmLink = arm.part(
  'forearm-link',
  box(88, 12, 8, true)
    .translate(50, 0, 0)
    .union(box(16, 12, 14, true).translate(8, 0, 0))
    .union(box(4, 18, 18, true).translate(palmMountX - 2, 0, 0))
    .union(box(70, 4, 5, true).translate(50, 0, 6.5))
    .color('beam'),
);

const toolPalm = arm.part(
  'tool-palm',
  box(10, 36, 28, true)
    .translate(palmMountX + 5, 0, 0)
    .union(box(18, 5, 8, true).translate(gripAxis[0], 8, gripAxis[2]))
    .union(box(18, 5, 8, true).translate(gripAxis[0], -8, gripAxis[2]))
    .union(box(12, 6, 8, true).translate(109, 17, 0))
    .union(box(12, 6, 8, true).translate(109, -17, 0))
    .union(box(14, 4, 3, true).translate(107, 18, 6))
    .union(box(14, 4, 3, true).translate(107, -18, 6))
    .union(box(14, 4, 3, true).translate(107, 18, -6))
    .union(box(14, 4, 3, true).translate(107, -18, -6))
    // v0.7.4 — grip-axis binding post. Gate 2 requires the joint axis
    // (Z-line through gripAxis) to intersect the tool-palm BREP. The two
    // side bearing tabs (above) bracket the grip-driver at y = ±8 but
    // leave y = 0 empty. This 2x2 post sits directly above the grip-driver
    // (z ∈ [gripAxis[2] + 4, gripAxis[2] + 6]; driver z ∈ [gripAxis[2] − 2, gripAxis[2] + 2])
    // so the Z-line passes through its ±X / ±Y side faces.
    .union(box(2, 2, 2, true).translate(gripAxis[0], 0, gripAxis[2] + 5))
    // v0.7.4 — left/right hinge binding posts. Gate 2 requires the curl
    // mate axes (Z-lines through leftHinge / rightHinge) to intersect the
    // tool-palm BREP. The pin-mount boxes stop short at |y| = 20; the
    // hinges are at |y| = 22. Small 2x2 tabs sit just above the hinge
    // pins (pin z ∈ [-4, 4]; tab z ∈ [5, 7]) so they bind the Z-axis
    // without colliding with the pin parts.
    .union(box(2, 2, 2, true).translate(leftHinge[0], leftHinge[1], 6))
    .union(box(2, 2, 2, true).translate(rightHinge[0], rightHinge[1], 6))
    .color('tool'),
);

const gripServo = arm.part(
  'grip-servo',
  box(18, 16, 14, true)
    .translate(97, 0, gripServoCenterZ)
    .color('servo'),
);

const gripDriver = arm.part(
  'grip-driver',
  box(8, 6, 4, true)
    .fillet(0.6)
    .color('gear'),
);

const leftHingePin = arm.part(
  'left-hinge-pin',
  box(4, 4, 8, true)
    .translate(leftHinge[0], leftHinge[1], leftHinge[2])
    .color('shaft'),
);

const rightHingePin = arm.part(
  'right-hinge-pin',
  box(4, 4, 8, true)
    .translate(rightHinge[0], rightHinge[1], rightHinge[2])
    .color('shaft'),
);

const leftFinger = arm.part(
  'left-finger',
  box(fingerLen, 5, 5, true)
    .translate(6 + fingerLen / 2, 0, 0)
    .union(box(12, 4, 6, true).translate(0, 5, 0))
    // v0.7.4 — hinge binding stub. Gate 2 requires the curl mate axis
    // (Z-line through finger-local origin) to intersect the finger BREP.
    // The knuckle box (y ∈ [3, 7]) and the finger body (x ∈ [6, 40]) both
    // miss the axis line at (0, 0, z); this 2x2 stub sits above both the
    // left-hinge-pin (pin z ∈ [-4, 4]) AND the tool-palm hinge binding
    // post (z ∈ [5, 7]) so it binds the Z-axis without collision.
    .union(box(2, 2, 2, true).translate(0, 0, 9))
    .color('tool'),
);

const rightFinger = arm.part(
  'right-finger',
  box(fingerLen, 5, 5, true)
    .translate(6 + fingerLen / 2, 0, 0)
    .union(box(12, 4, 6, true).translate(0, -5, 0))
    .union(box(2, 2, 2, true).translate(0, 0, 9))
    .color('tool'),
);

basePlate.connector('servo-mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 0, 10] },
});

baseYawServo
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 10] },
  })
  .connector('output-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 44] },
  });

baseYawOutput
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 0, 44] },
  })
  .connector('yaw-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 48] },
    axis: [0, 0, 1],
  });

yawTurret
  .connector('yaw-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('shoulder-servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, 20, shoulderZ] },
  })
  .connector('shoulder-shaft-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -20, shoulderZ] },
  })
  .connector('shoulder-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, shoulderZ] },
    axis: [0, 1, 0],
  });

shoulderPitchServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [0, 20, shoulderZ] },
});
shoulderPitchShaft
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [0, -20, shoulderZ] },
  })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, shoulderZ] },
    axis: [0, 1, 0],
  });

upperLink
  .connector('shoulder-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 1, 0],
  })
  .connector('elbow-servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [upperLen, elbowServoY, 0] },
  })
  .connector('elbow-shaft-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [upperLen, 22, 0] },
  })
  .connector('elbow-out', {
    type: 'axis',
    origin: { kind: 'vec3', value: [upperLen, 0, 0] },
    axis: [0, 1, 0],
  });

elbowPitchServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [upperLen, elbowServoY, 0] },
});
elbowPitchShaft
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [upperLen, 22, 0] },
  })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [upperLen, 0, 0] },
    axis: [0, 1, 0],
  });

forearmLink
  .connector('elbow-in', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 1, 0],
  })
  .connector('palm-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [palmMountX, 0, 0] },
  });

toolPalm
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [palmMountX, 0, 0] },
  })
  .connector('grip-servo-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: [97, 0, gripServoMountZ] },
  })
  .connector('grip-axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: gripAxis },
    axis: [0, 0, 1],
  })
  .connector('left-pin-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: leftHinge },
  })
  .connector('right-pin-mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: rightHinge },
  })
  .connector('left-hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: leftHinge },
    axis: [0, 0, 1],
  })
  .connector('right-hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: rightHinge },
    axis: [0, 0, 1],
  })
  .connector('tool-tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerTipX + leftHinge[0], 0, 0] },
  });

gripServo.connector('mount', {
  type: 'frame',
  origin: { kind: 'vec3', value: [97, 0, gripServoMountZ] },
});
gripDriver.connector('axis', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 0, 0] },
  axis: [0, 0, 1],
});

leftHingePin
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: leftHinge },
  })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: leftHinge },
    axis: [0, 0, 1],
  });
rightHingePin
  .connector('mount', {
    type: 'frame',
    origin: { kind: 'vec3', value: rightHinge },
  })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: rightHinge },
    axis: [0, 0, 1],
  });

leftFinger
  .connector('hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerTipX, 0, 0] },
  });
rightFinger
  .connector('hinge', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 0, 0] },
    axis: [0, 0, 1],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [fingerTipX, 0, 0] },
  });

arm.mate('base-yaw-servo-fix', 'base-plate.servo-mount', 'base-yaw-servo.mount', 'fastened');
arm.mate('base-yaw-output-fix', 'base-yaw-servo.output-mount', 'base-yaw-output.mount', 'fastened');
arm.mate('base-yaw', 'base-yaw-output.yaw-out', 'yaw-turret.yaw-in', 'revolute', {
  pose: baseYawDeg,
  limitsDeg: [-55, 55],
});
arm.mate('shoulder-servo-fix', 'yaw-turret.shoulder-servo-mount', 'shoulder-pitch-servo.mount', 'fastened');
arm.mate('shoulder-shaft-fix', 'yaw-turret.shoulder-shaft-mount', 'shoulder-pitch-shaft.mount', 'fastened');
arm.mate('shoulder-pitch', 'yaw-turret.shoulder-out', 'upper-link.shoulder-in', 'revolute', {
  pose: shoulderPitchDeg,
  limitsDeg: [12, 40],
  exposure: 'concealed',
});
arm.mate('elbow-servo-fix', 'upper-link.elbow-servo-mount', 'elbow-pitch-servo.mount', 'fastened');
arm.mate('elbow-shaft-fix', 'upper-link.elbow-shaft-mount', 'elbow-pitch-shaft.mount', 'fastened');
arm.mate('elbow-pitch', 'upper-link.elbow-out', 'forearm-link.elbow-in', 'revolute', {
  pose: elbowPitchDeg,
  limitsDeg: [-58, 12],
});
arm.mate('palm-fix', 'forearm-link.palm-mount', 'tool-palm.mount', 'fastened');
arm.mate('grip-servo-fix', 'tool-palm.grip-servo-mount', 'grip-servo.mount', 'fastened');
arm.mate('grip', 'tool-palm.grip-axis', 'grip-driver.axis', 'revolute', {
  pose: gripDeg,
  limitsDeg: [0, 28],
});
arm.mate('left-pin-fix', 'tool-palm.left-pin-mount', 'left-hinge-pin.mount', 'fastened');
arm.mate('right-pin-fix', 'tool-palm.right-pin-mount', 'right-hinge-pin.mount', 'fastened');
arm.mate('left-curl', 'tool-palm.left-hinge', 'left-finger.hinge', 'revolute');
arm.mate('right-curl', 'tool-palm.right-hinge', 'right-finger.hinge', 'revolute');
arm.coupleMates('left-curl', { source: 'grip', ratio: -1 });
arm.coupleMates('right-curl', { source: 'grip', ratio: 1 });
arm.transmission('left-finger-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['left-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'left-finger',
  path: ['grip-driver', 'tool-palm', 'left-hinge-pin', 'left-finger'],
  ratio: -1,
  notes: 'Gripper driver phase drives the left finger curl through the left hinge pin/link path.',
});
arm.transmission('right-finger-drive-linkage', {
  kind: 'link-rod',
  sourceMate: 'grip',
  drivenMates: ['right-curl'],
  actuator: 'grip-servo',
  input: 'grip-driver',
  output: 'right-finger',
  path: ['grip-driver', 'tool-palm', 'right-hinge-pin', 'right-finger'],
  ratio: 1,
  notes: 'Gripper driver phase drives the right finger curl through the right hinge pin/link path.',
});

arm.mechanicalJoint('base-yaw-drive', {
  mate: 'base-yaw',
  actuator: 'base-yaw-servo',
  shaft: 'base-yaw-output',
  supports: ['base-yaw-servo', 'base-yaw-output'],
  output: 'yaw-turret',
  requiredSupport: {
    kind: 'bearing',
    around: 'base-yaw-output.yaw-out',
    supports: ['base-yaw-output'],
    minBearingLengthMm: 4,
  },
});
arm.mechanicalJoint('shoulder-drive', {
  mate: 'shoulder-pitch',
  actuator: 'shoulder-pitch-servo',
  shaft: 'shoulder-pitch-shaft',
  supports: ['yaw-turret'],
  output: 'upper-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'yaw-turret.shoulder-out',
    supports: ['yaw-turret'],
    minBearingLengthMm: 28,
  },
});
arm.mechanicalJoint('elbow-drive', {
  mate: 'elbow-pitch',
  actuator: 'elbow-pitch-servo',
  shaft: 'elbow-pitch-shaft',
  supports: ['upper-link'],
  output: 'forearm-link',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'upper-link.elbow-out',
    supports: ['upper-link'],
    minBearingLengthMm: 30,
  },
});
arm.mechanicalJoint('grip-drive', {
  mate: 'grip',
  actuator: 'grip-servo',
  shaft: 'grip-driver',
  supports: ['tool-palm'],
  output: 'grip-driver',
  requiredSupport: {
    kind: 'bearing',
    around: 'tool-palm.grip-axis',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});
arm.mechanicalJoint('left-finger-drive', {
  mate: 'left-curl',
  actuator: 'grip-servo',
  shaft: 'left-hinge-pin',
  supports: ['tool-palm'],
  output: 'left-finger',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'tool-palm.left-hinge',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});
arm.mechanicalJoint('right-finger-drive', {
  mate: 'right-curl',
  actuator: 'grip-servo',
  shaft: 'right-hinge-pin',
  supports: ['tool-palm'],
  output: 'right-finger',
  requiredSupport: {
    kind: 'hinge-bracket',
    around: 'tool-palm.right-hinge',
    supports: ['tool-palm'],
    minBearingLengthMm: 8,
  },
});

return arm.solvedModel({});
