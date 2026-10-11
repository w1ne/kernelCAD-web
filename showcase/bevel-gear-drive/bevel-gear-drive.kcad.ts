// Bevel gear drive — meshing straight bevel pair at 90 degrees
//
// Prompt: "Bevel gear drive: meshing bevel gear pair at 90 degrees."
//
// Words -> geometry:
//   "bevel gear"   -> bevelGear(): an involute tooth outline (Tredgold
//                     back-cone approximation: the tooth form of a spur gear
//                     with z / cos(delta) virtual teeth, wrapped onto the real
//                     pitch circle) lofted RULED toward the pitch-cone apex,
//                     so every tooth line converges on the apex the way a
//                     straight bevel's does; the heel is trimmed to the back
//                     cone.
//   "pair at 90"   -> pitch-cone angles delta1 = atan(z1/z2), delta2 = 90 - delta1;
//                     both apexes sit at the origin, the pinion on Z and the
//                     gear on X, the gear turned half a tooth so a tooth meets
//                     a gap on the contact line.
//   "drive"        -> both gears on shafts in bearing bosses of one L-frame;
//                     revolute mates, the pinion coupled to the gear at
//                     +z2/z1 (both axes point away from the mesh, so equal
//                     pitch-point speeds need a positive ratio) and a
//                     gear-pair transmission, so the mechanism check turns the
//                     pair together and tests the teeth for interference.
//
// kernelCAD has a spurGear() primitive but no bevel-gear primitive, so the
// teeth are generated here from the involute equations.

const z1Choice = param('pinionTeeth', '16', { choices: ['12', '14', '16', '18', '20'] });
const z2Choice = param('gearTeeth', '24', { choices: ['20', '24', '28', '32'] });
const gearDeg = param('gearDeg', 0, { min: -180, max: 180, description: 'Gear (driven) rotation (deg); the pinion turns z2/z1 times as far' });

const Z1 = Number(z1Choice.value);
const Z2 = Number(z2Choice.value);
const M = 2;          // module at the heel (back face), mm
const FACE = 10;      // face width along the cone, mm
const BACKLASH = 0.35; // circumferential, mm at the heel — printed-gear running clearance
const PA = (20 * Math.PI) / 180;

const D1 = Math.atan2(Z1, Z2); // pinion pitch-cone half angle (rad)
const D2 = Math.PI / 2 - D1;

const inv = (a: number) => Math.tan(a) - a;

/** Heel outline of a straight bevel gear (Tredgold), in the back-face plane. */
function heelOutline(z: number, delta: number): [number, number][] {
  const r = (M * z) / 2;                 // real pitch radius
  const rv = r / Math.cos(delta);        // virtual (back-cone) pitch radius
  const zv = z / Math.cos(delta);
  const rb = rv * Math.cos(PA);
  const rTip = rv + M;
  const rRoot = rv - 1.25 * M;
  // Half tooth thickness (arc) on the virtual gear at radius rho.
  const halfArc = (rho: number) => {
    const a = Math.acos(Math.min(1, rb / rho));
    return rho * (Math.PI / (2 * zv) + inv(PA) - inv(a)) - BACKLASH / 4;
  };
  // Map virtual radius -> real radius in the planar heel. A radial step of
  // h / cos(delta) at fixed z is a step of exactly h perpendicular to the pitch
  // cone, so addendum (m) and dedendum (1.25 m) are true normal to the cone and
  // the 0.25 m tip/root clearance survives between the two gears.
  const realR = (rho: number) => r + (rho - rv) / Math.cos(delta);
  // Angular half-thickness: the arc lives on the back cone, whose point at
  // virtual radius rho is r + (rho - rv) cos(delta) from the gear axis; the
  // angle is carried unchanged along the ruling to the planar heel.
  const halfAngle = (rho: number) => halfArc(rho) / (r + (rho - rv) * Math.cos(delta));

  const flank: [number, number][] = []; // [realRadius, halfAngle], root -> tip
  const rStart = Math.max(rRoot, rb);
  // Below the base circle the flank continues as a radial line.
  if (rRoot < rb) flank.push([realR(rRoot), halfAngle(rb)]);
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const rho = rStart + ((rTip - rStart) * i) / n;
    flank.push([realR(rho), halfAngle(rho)]);
  }
  const pitchAng = (2 * Math.PI) / z;
  const pts: [number, number][] = [];
  for (let k = 0; k < z; k++) {
    const c = k * pitchAng;
    // root arc point midway to the previous tooth
    const rr = realR(rRoot);
    pts.push([rr * Math.cos(c - pitchAng / 2), rr * Math.sin(c - pitchAng / 2)]);
    // leading flank root -> tip (angle c - half)
    for (const [R, h] of flank) pts.push([R * Math.cos(c - h), R * Math.sin(c - h)]);
    // trailing flank tip -> root (angle c + half)
    for (let j = flank.length - 1; j >= 0; j--) {
      const [R, h] = flank[j];
      pts.push([R * Math.cos(c + h), R * Math.sin(c + h)]);
    }
  }
  return pts;
}

function polySketch(pts: [number, number][], scale: number) {
  let p = path().moveTo(pts[0][0] * scale, pts[0][1] * scale);
  for (let i = 1; i < pts.length; i++) p = p.lineTo(pts[i][0] * scale, pts[i][1] * scale);
  return p.close();
}

/**
 * Straight bevel gear along +Z, apex at the origin, teeth on z < 0.
 * hubLen: plain hub below the heel (the shaft is fused into it by the caller).
 */
function bevelGear(z: number, delta: number, hubLen: number, hubR: number) {
  const r = (M * z) / 2;
  const coneDist = r / Math.sin(delta);
  const k = 1 - FACE / coneDist;              // toe / heel scale
  const zHeel = -r / Math.tan(delta);         // back face, measured from the apex
  const zToe = zHeel + FACE * Math.cos(delta);
  const outline = heelOutline(z, delta);
  const teeth = polySketch(outline, 1).loft(polySketch(outline, k), {
    ruled: true,
    planes: [
      { plane: 'XY', origin: [0, 0, zHeel] },
      { plane: 'XY', origin: [0, 0, zToe] },
    ],
  });
  // Trim the heel to the BACK CONE (the cone through the heel pitch circle,
  // perpendicular to the pitch cone), as on a real bevel blank: in the (r, z)
  // half-plane keep r sin(delta) - z cos(delta) <= coneDist.
  const rBig = r + 4 * M;
  const backCone = path()
    .moveTo(0, 5)
    .lineTo(rBig, 5)
    .lineTo(rBig, (rBig * Math.sin(delta) - coneDist) / Math.cos(delta))
    .lineTo(0, -coneDist / Math.cos(delta))
    .close()
    .revolve();
  const hub = cylinder(hubLen + 0.2, hubR, 64).translate(0, 0, zHeel - hubLen);
  return union(teeth.intersect(backCone), hub);
}

const r1 = (M * Z1) / 2;
const r2 = (M * Z2) / 2;
const zHeel1 = -r1 / Math.tan(D1);
const zHeel2 = -r2 / Math.tan(D2);
const SHAFT_R = 4;

// --- Frame: base plate + upright, each with a bearing boss -----------------
const PIN_SHAFT_END = zHeel1 - 28;       // pinion shaft runs down to the base plate
const GEAR_SHAFT_END = -zHeel2 + 28;     // gear shaft runs out along +X to the upright
const baseZ = PIN_SHAFT_END;
const uprightX = GEAR_SHAFT_END;
const frame = union(
  box(uprightX + 30, 64, 6, false).translate(-30, -32, baseZ - 6),                // base plate
  box(6, 64, -baseZ + 6 + 20, false).translate(uprightX, -32, baseZ - 6),        // upright
  cylinder(14, 11, 48).translate(0, 0, baseZ - 0.1),                             // pinion bearing boss
  cylinder(14, 11, 48).rotateY(-90).translate(uprightX + 0.1, 0, 0),            // gear bearing boss
).subtract(
  cylinder(30, SHAFT_R + 0.25, 48).translate(0, 0, baseZ - 10),
  cylinder(30, SHAFT_R + 0.25, 48).rotateY(90).translate(uprightX - 20, 0, 0),
);

const axisConn = (o: [number, number, number], a: [number, number, number]) =>
  ({ type: 'axis' as const, origin: { kind: 'vec3' as const, value: o }, axis: a });

const drive = assembly('bevel-gear-drive');
drive
  .part('frame', frame.finish('paint-matte', { color: '#5f6b78' }), { material: 'aluminum-6061' })
  .connector('pinion-bearing', axisConn([0, 0, 0], [0, 0, 1]))
  .connector('gear-bearing', axisConn([0, 0, 0], [1, 0, 0]));

// Pinion on Z, teeth up toward the apex, shaft down into the base boss.
const pinion = union(
  bevelGear(Z1, D1, 8, r1 * 0.55),
  cylinder(zHeel1 - 8 - PIN_SHAFT_END + 4, SHAFT_R, 48).translate(0, 0, PIN_SHAFT_END - 4),
);
drive.part('pinion', pinion.finish('steel'), { material: 'mild-steel' }).connector('axis', axisConn([0, 0, 0], [0, 0, 1]));

// Gear on X: build along +Z, turn half a tooth (a gap faces the contact line
// when Z2 is even), then point its teeth toward -X so both apexes coincide.
const halfTooth = Z2 % 2 === 0 ? 180 / Z2 : 0;
const gear = union(
  bevelGear(Z2, D2, 6, r2 * 0.5),
  cylinder(38, SHAFT_R, 48).translate(0, 0, zHeel2 - 38), // shaft: heel face out through the upright boss
).rotateZ(halfTooth).rotateY(-90);
drive.part('gear', gear.finish('brass'), { material: 'mild-steel' }).connector('axis', axisConn([0, 0, 0], [1, 0, 0]));

drive.mate('gear-turn', 'frame.gear-bearing', 'gear.axis', 'revolute', { limitsDeg: [-180, 180], pose: gearDeg, exposure: 'concealed' });
drive.mate('pinion-turn', 'frame.pinion-bearing', 'pinion.axis', 'revolute', { exposure: 'concealed' });
drive.coupleMates('pinion-turn', { source: 'gear-turn', ratio: Z2 / Z1 });
drive.transmission('bevel-mesh', {
  kind: 'gear-pair',
  sourceMate: 'gear-turn',
  drivenMates: ['pinion-turn'],
  input: 'pinion',
  output: 'gear',
  path: ['pinion', 'gear'],
  ratio: Z2 / Z1,
});

animationView({ param: 'gearDeg', from: -90, to: 90, durationMs: 6000, fps: 20 });

return drive.solvedModel({});
