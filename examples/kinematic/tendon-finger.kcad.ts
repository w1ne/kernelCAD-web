// Tendon-driven robotic finger — palm + 3 phalanges, routed straps.
//
// A motor-driven FLEXOR strap runs along the palmar side: palm anchor ->
// pulley loop on the proximal phalanx -> pulley loop on the middle phalanx
// -> distal tip. Positive ctrl on the `flexor` motor is cable TENSION, so the
// finger curls toward the palm. A passive DORSAL extensor strap (a spring
// on the back of the finger, wrapped over the two knuckles) returns it.
//
// Exercises arm.tendon routing: `via` connector points + `{ wrap }` entries,
// `actuator` (inextensible driven cable, no rest length / stiffness),
// `visualStyle: 'strap'` with a braid texture, and a passive spring that also
// uses `via`.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/tendon-finger.kcad.ts

// Joint pose sliders (degrees, positive = curl toward the palmar side).
const mcpDeg = param('mcpDeg', 0, { min: 0, max: 85 });
const pipDeg = param('pipDeg', 0, { min: 0, max: 100 });
const dipDeg = param('dipDeg', 0, { min: 0, max: 70 });

// 16x8 braid tile, tiled along the strap every 4 mm of cable.
const BRAID_TEXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAICAIAAAB/FOjAAAAAOklEQVR42mNICHO6d+0IBAHZ07oKIAiXOANJqoFsBpJUA0UYSFIN0kCSapAGklSD/ECSalAokaQaiAD9TeCBNViY9gAAAABJRU5ErkJggg==';

const mPalm = { baseColor: '#3f4651', metalness: 0.45, roughness: 0.55 };
const mBone = { baseColor: '#d9d2bd', metalness: 0.15, roughness: 0.6 };

// Phalanx cross-section (Y width x Z thickness) and lengths along +X.
const W = 16;
const T = 10;
const L_PROX = 40;
const L_MID = 28;
const L_DIST = 24;
const PULLEY_Z = T / 2 + 2;     // pulley loops stand 2 mm off the palmar / dorsal face

const style = {
  knuckleR: 6,
  forkGapY: W,
  tongueY: W - 4,
  plateT: 3,
  pinR: 2,
  pinCapR: 3,
  pinCapThickness: 4,
};

const arm = assembly('tendon-finger');

const palmBody = box(40, 30, 22, true).translate(-20, 0, 0).material(mPalm);
const proxBody = box(L_PROX - 6, W, T, true).translate(3 + (L_PROX - 6) / 2, 0, 0).material(mBone);
const midBody = box(L_MID - 6, W, T, true).translate(3 + (L_MID - 6) / 2, 0, 0).material(mBone);
const distBody = box(L_DIST - 3, W, T, true).translate(3 + (L_DIST - 3) / 2, 0, 0).material(mBone);

const mcp = joint.clevis({
  parentBody: palmBody, childBody: proxBody, axis: [0, 1, 0],
  pivotParent: [0, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 85], liftPivot: true, style,
});
const pip = joint.clevis({
  parentBody: mcp.childGeometry, childBody: midBody, axis: [0, 1, 0],
  pivotParent: [L_PROX, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 100], liftPivot: true, style,
});
const dip = joint.clevis({
  parentBody: pip.childGeometry, childBody: distBody, axis: [0, 1, 0],
  pivotParent: [L_MID, 0, 0], pivotChild: [0, 0, 0], limitsDeg: [0, 70], liftPivot: true, style,
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
  .connector('flexorIn', point([-24, 0, -PULLEY_Z]))
  .connector('extensorIn', point([-24, 0, PULLEY_Z]));

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

arm.mate('mcp', 'palm.mcpAxis', 'prox.mcpAxis', 'revolute', { pose: mcpDeg, limitsDeg: [0, 85] });
arm.mate('pip', 'prox.pipAxis', 'mid.pipAxis', 'revolute', { pose: pipDeg, limitsDeg: [0, 100] });
arm.mate('dip', 'mid.dipAxis', 'dist.dipAxis', 'revolute', { pose: dipDeg, limitsDeg: [0, 70] });

// Flexor: motor-driven braided strap on the palmar side (inextensible).
arm.tendon('flexor', {
  from: 'palm.flexorIn',
  via: ['prox.flexorLoop', 'mid.flexorLoop'],
  to: 'dist.flexorTip',
  actuator: { maxForceN: 40 },
  visualStyle: 'strap',
  strapWidthMm: 5,
  visualDiameterMm: 1.2,
  strapWidthAxis: [0, 1, 0],
  material: { baseColor: '#e8dfc8', metalness: 0.1, roughness: 0.75 },
  texture: { path: BRAID_TEXTURE, periodMm: 4 },
});

// Extensor: passive spring strap over the back of the finger, riding the
// knuckle wrap cylinders of the middle and distal phalanges.
arm.tendon('extensor', {
  from: 'palm.extensorIn',
  via: [
    'prox.extensorLoop',
    { wrap: { partName: 'mid', wrapName: 'knuckle', sidesite: [0, 0, 12] } },
    'mid.extensorLoop',
    { wrap: { partName: 'dist', wrapName: 'knuckle', sidesite: [0, 0, 12] } },
  ],
  to: 'dist.extensorTip',
  restLengthMm: 95,
  stiffnessNmm: 0.05,
  dampingNsmm: 0.01,
  visualStyle: 'strap',
  strapWidthMm: 4,
  material: { baseColor: '#9aa3b2', metalness: 0.1, roughness: 0.7 },
  texture: { path: BRAID_TEXTURE, periodMm: 4 },
});

return arm.solvedModel({});
