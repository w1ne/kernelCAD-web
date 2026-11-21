// Tendon-driven robotic finger — palm + 3 phalanges, routed straps.
//
// A motor-driven FLEXOR strap runs along the palmar side: palm anchor ->
// pulley loop on the proximal phalanx -> pulley loop on the middle phalanx
// -> distal tip. Positive ctrl on the `flexor` motor is cable TENSION, so the
// finger curls toward the palm. A second motor-driven EXTENSOR strap runs over
// the back of the finger, riding wrap cylinders at the three knuckles. Each
// joint also carries a torsion spring (stiffnessNmmPerDeg / springRefDeg), the
// passive return when both motors relax.
//
// Exercises arm.tendon routing: `via` connector points + `{ wrap }` entries,
// `actuator` (inextensible driven cable, no rest length / stiffness),
// `profile` (flat ribbon) with a braid texture, and revolute joint compliance.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/tendon-finger.kcad.ts

// Joint pose sliders (degrees, positive = curl toward the palmar side).
const mcpDeg = param('mcpDeg', 0, { min: 0, max: 85 });
const pipDeg = param('pipDeg', 0, { min: 0, max: 100 });
const dipDeg = param('dipDeg', 0, { min: 0, max: 70 });

// 16x8 braid tile, laid along the strap (u = arc length / strap width).
const BRAID_TEXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAOklEQVR42mNICHO6d+0IBAHZ07oKIAiXOANJqoFsBpJUA0UYSFIN0kCSapAGklSD/ECSalAokaQaiAD9TeCBNViY9gAAAABJRU5ErkJggg==';

const mPalm = { baseColor: '#3f4651', metalness: 0.45, roughness: 0.55 };
const mBone = { baseColor: '#d9d2bd', metalness: 0.15, roughness: 0.6 };

// Phalanx thickness (Z) and lengths along +X. Each phalanx is 4 mm narrower
// (Y) than the one that carries it: a fork is 2 mm narrower than its own
// phalanx, so the fork plates are sunk 1 mm into each side face, and the next
// phalanx runs between the plates with 1 mm of clearance per side.
const T = 10;
const W_PROX = 16;
const W_MID = 12;
const W_DIST = 8;
const L_PROX = 40;
const L_MID = 28;
const L_DIST = 24;
const PALM_T = T + 2;
const PULLEY_Z = T / 2 + 2;     // pulley loops stand 2 mm off the palmar / dorsal face
const PALM_PULLEY_Z = PALM_T / 2 + 2;

// A fork 2 mm wider than the phalanx it holds; the tongue leaves 2 mm of
// daylight to each plate.
const forkFor = (childW: number) => ({
  knuckleR: 6,
  forkGapY: childW + 2,
  tongueY: childW - 2,
  plateT: 3,
  pinR: 2,
  pinCapR: 3,
  pinCapThickness: 4,
});

const arm = assembly('tendon-finger');

// A carrying body reaches its fork pin; `joint.clevis` cuts the slot for the
// next phalanx between the plates. A carried body starts 3 mm past its pin.
const palmBody = box(40, 30, PALM_T, true).translate(-20, 0, 0).material(mPalm);
const proxBody = box(L_PROX - 3, W_PROX, T, true).translate(3 + (L_PROX - 3) / 2, 0, 0).material(mBone);
const midBody = box(L_MID - 3, W_MID, T, true).translate(3 + (L_MID - 3) / 2, 0, 0).material(mBone);
const distBody = box(L_DIST - 3, W_DIST, T, true).translate(3 + (L_DIST - 3) / 2, 0, 0).material(mBone);

// Every pin is on the finger centre line (`liftPivot: false`), so the straight
// finger is one line and it curls under the palm.
const mcp = joint.clevis({
  parentBody: palmBody, childBody: proxBody, axis: [0, 1, 0],
  pivotParent: [0, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 85], liftPivot: false, style: forkFor(W_PROX),
});
const pip = joint.clevis({
  parentBody: mcp.childGeometry, childBody: midBody, axis: [0, 1, 0],
  pivotParent: [L_PROX, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 100], liftPivot: false, style: forkFor(W_MID),
});
const dip = joint.clevis({
  parentBody: pip.childGeometry, childBody: distBody, axis: [0, 1, 0],
  pivotParent: [L_MID, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 70], liftPivot: false, style: forkFor(W_DIST),
});

const axisConnector = (j: { origin: [number, number, number]; axis: [number, number, number]; clearanceRadius?: number }) => ({
  type: 'axis' as const,
  origin: { kind: 'vec3' as const, value: j.origin },
  axis: j.axis,
  jointClearanceRadius: j.clearanceRadius,
});
const point = (value: [number, number, number]) => ({ type: 'frame' as const, origin: { kind: 'vec3' as const, value } });

arm.part('palm', mcp.parentGeometry, { density: 2700 })
  .connector('mcpAxis', axisConnector(mcp.parentConnector))
  // 2 mm off the palmar / dorsal palm face, like the phalanx loops.
  .connector('flexorIn', point([-24, 0, -PALM_PULLEY_Z]))
  .connector('extensorIn', point([-24, 0, PALM_PULLEY_Z]));

arm.part('prox', pip.parentGeometry, { density: 1200 })
  .connector('mcpAxis', axisConnector(mcp.childConnector))
  .connector('pipAxis', axisConnector(pip.parentConnector))
  .connector('flexorLoop', point([22, 0, -PULLEY_Z]))
  .connector('extensorLoop', point([22, 0, PULLEY_Z]))
  .wrapGeom('knuckle', { axis: [0, 1, 0], origin: [0, 0, 0], radius: 7.5, halfLengthMm: 4 });

arm.part('mid', dip.parentGeometry, { density: 1200 })
  .connector('pipAxis', axisConnector(pip.childConnector))
  .connector('dipAxis', axisConnector(dip.parentConnector))
  .connector('flexorLoop', point([15, 0, -PULLEY_Z]))
  .connector('extensorLoop', point([15, 0, PULLEY_Z]))
  .wrapGeom('knuckle', { axis: [0, 1, 0], origin: [0, 0, 0], radius: 7.5, halfLengthMm: 4 });

arm.part('dist', dip.childGeometry, { density: 1200 })
  .connector('dipAxis', axisConnector(dip.childConnector))
  .connector('flexorTip', point([16, 0, -PULLEY_Z]))
  .connector('extensorTip', point([16, 0, PULLEY_Z]))
  .wrapGeom('knuckle', { axis: [0, 1, 0], origin: [0, 0, 0], radius: 7.5, halfLengthMm: 4 });

// Joint torsion springs: zero torque at -10 deg, i.e. preloaded against the
// 0 deg extension stop, so the finger rests straight and curls only while
// the flexor out-pulls them. Springref is in the same angle sign as the pose.
const jointSpring = { stiffnessNmmPerDeg: 3, springRefDeg: -10, dampingNmmsPerDeg: 0.05 };

arm.mate('mcp', 'palm.mcpAxis', 'prox.mcpAxis', 'revolute', { pose: mcpDeg, limitsDeg: [0, 85], ...jointSpring });
arm.mate('pip', 'prox.pipAxis', 'mid.pipAxis', 'revolute', { pose: pipDeg, limitsDeg: [0, 100], ...jointSpring });
arm.mate('dip', 'mid.dipAxis', 'dist.dipAxis', 'revolute', { pose: dipDeg, limitsDeg: [0, 70], ...jointSpring });

// Flexor: motor-driven braided strap on the palmar side (inextensible).
arm.tendon('flexor', {
  from: 'palm.flexorIn',
  via: ['prox.flexorLoop', 'mid.flexorLoop'],
  to: 'dist.flexorTip',
  actuator: { kind: 'force', maxForceN: 40 },
  profile: { kind: 'flat', widthMm: 5, thicknessMm: 1.2, widthAxis: [0, 1, 0] },
  material: { baseColor: '#e8dfc8', metalness: 0.1, roughness: 0.75, textures: { albedo: { path: BRAID_TEXTURE } } },
});

// Extensor: a second motor-driven strap over the back of the finger, riding
// the knuckle wrap cylinders so it clears the joints at every curl angle.
// The joint springs (above) are the passive return when both motors relax.
arm.tendon('extensor', {
  from: 'palm.extensorIn',
  via: [
    { wrap: { partName: 'prox', wrapName: 'knuckle', sidesite: [0, 0, 12] } },
    'prox.extensorLoop',
    { wrap: { partName: 'mid', wrapName: 'knuckle', sidesite: [0, 0, 12] } },
    'mid.extensorLoop',
    { wrap: { partName: 'dist', wrapName: 'knuckle', sidesite: [0, 0, 12] } },
  ],
  to: 'dist.extensorTip',
  actuator: { kind: 'force', maxForceN: 20 },
  profile: { kind: 'flat', widthMm: 4, thicknessMm: 1.2 },
  material: { baseColor: '#9aa3b2', metalness: 0.1, roughness: 0.7, textures: { albedo: { path: BRAID_TEXTURE } } },
});

return arm.solvedModel({});
