// Original kernelCAD low-poly knight: faceted plate armour with a great helm
// and plume, a cloth tabard, a sword in the right hand and a heater shield on
// the left forearm, rigged at the neck, waist, shoulders, elbows, hips and
// knees. Each joint connector sits at the same point on both links, so pose 0
// is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'knight-figure',
  license: 'CC0-1.0',
  title: 'Knight',
  description: 'Armoured medieval knight with great helm, plume, tabard, sword and heater shield, with neck, waist, shoulder, elbow, hip and knee pivots rigged as GLB nodes. Knobs: weapon, shield, armour, trim, tabard, plume and leather colours.',
  tags: ['knight', 'soldier', 'warrior', 'medieval', 'armour', 'armor', 'sword', 'shield', 'fantasy', 'humanoid', 'character', 'npc', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'medieval', 'fantasy', 'village'],
  triangleBudget: 900,
});

const weapon = param('weapon', 'sword', { choices: ['sword', 'spear', 'none'], label: 'Weapon' });
const shieldOn = param('shield', 'yes', { choices: ['yes', 'no'], label: 'Shield' });
const armour = param('armour', '#a9b0b8', { label: 'Armour' });
const trim = param('trim', '#d4a83a', { label: 'Trim' });
const tabard = param('tabard', '#2f4fa8', { label: 'Tabard and shield' });
const plume = param('plume', '#d8342c', { label: 'Plume' });
const leather = param('leather', '#5a3a24', { label: 'Leather' });

presets({
  crimson: { tabard: '#9c2228', plume: '#f2f0e8' },
  dark: { armour: '#3b3f45', trim: '#8a8f96', tabard: '#1e1e22', plume: '#5a2fd0' },
  forest: { tabard: '#2f6b3a', plume: '#d4a83a', trim: '#c9cdd1' },
});

const r = assembly('knight-figure');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};
const fix = (parent: string, child: string, o: { kind: 'vec3'; value: [number, number, number] }) => {
  refs[parent].connector(child, { type: 'frame', origin: o });
  refs[child].connector(child, { type: 'frame', origin: o });
  r.mate(child, `${parent}.${child}`, `${child}.${child}`, 'fastened');
};
const oct = (rad: number, n = 8) => {
  let p = path().moveTo(rad * Math.cos(Math.PI / n), rad * Math.sin(Math.PI / n));
  for (let i = 1; i < n; i++) {
    const a = Math.PI / n + (2 * i * Math.PI) / n;
    p = p.lineTo(rad * Math.cos(a), rad * Math.sin(a));
  }
  return p.close();
};
// Faceted segment at x from z0 to z1, radius r0 to r1.
const seg = (x: number, z0: number, z1: number, r0: number, r1: number, n = 6) =>
  oct(r0, n).loft(oct(r1, n), { spacing: z1 - z0, ruled: true }).translate(x, 0, z0);
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const ankleZ = 90;
const kneeZ = 490;
const hipZ = 880;
const waistZ = 1060;
const shoulderZ = 1400;
const neckZ = 1460;
const elbowZ = 1130;
const wristZ = 870;
const hipX = 105;
const shoulderX = 225;

// Pelvis: armoured fauld; tabard skirt hangs from it.
add('pelvis', seg(0, hipZ - 60, waistZ + 30, 165, 150).scale([1, 0.7, 1]).color(armour));
add('skirt', blk(-150, -122, hipZ - 230, 150, -100, waistZ).union(blk(-150, 100, hipZ - 230, 150, 122, waistZ)).union(blk(-150, -110, waistZ - 40, 150, 110, waistZ)).color(tabard));
fix('pelvis', 'skirt', at(0, 0, waistZ - 20));
add('belt', seg(0, waistZ - 20, waistZ + 30, 180, 180).scale([1, 0.72, 1]).color(leather));
fix('pelvis', 'belt', at(0, 0, waistZ));

// Chest: breastplate flaring to the shoulders, tabard front and gorget.
add('chest', seg(0, waistZ, shoulderZ, 150, 205, 8).scale([1, 0.65, 1]).union(seg(0, shoulderZ - 20, neckZ + 20, 120, 80)).color(armour));
add('tabard-front', blk(-110, -142, waistZ, 110, -118, shoulderZ - 60).union(blk(-110, 105, waistZ, 110, 128, shoulderZ - 60))
  .union(blk(-110, -125, shoulderZ - 90, 110, 110, shoulderZ - 60)).color(tabard));
fix('chest', 'tabard-front', at(0, 0, shoulderZ - 80));
add('cross', blk(-20, -150, waistZ + 60, 20, -140, shoulderZ - 80).union(blk(-80, -150, shoulderZ - 200, 80, -140, shoulderZ - 160)).color(trim));
fix('tabard-front', 'cross', at(0, -145, shoulderZ - 180));
hinge('pelvis', 'chest', 'waist', at(0, 0, waistZ), [1, 0, 0], [-25, 45]);

// Great helm: faceted bucket with a visor slit, crown band and plume.
add('head', seg(0, neckZ, neckZ + 290, 125, 115, 8).union(seg(0, neckZ + 290, neckZ + 330, 115, 70, 8)).color(armour));
add('visor', blk(-95, -128, neckZ + 170, 95, -110, neckZ + 195).color(leather));
fix('head', 'visor', at(0, -120, neckZ + 180));
add('crown', seg(0, neckZ + 250, neckZ + 290, 128, 120, 8).color(trim));
fix('head', 'crown', at(0, 0, neckZ + 270));
add('plume', blk(-25, -60, neckZ + 320, 25, 80, neckZ + 420).union(blk(-25, 40, neckZ + 250, 25, 170, neckZ + 380)).color(plume));
fix('head', 'plume', at(0, 0, neckZ + 330));
hinge('chest', 'head', 'neck', at(0, 0, neckZ), [0, 0, 1], [-70, 70]);

for (const sd of [-1, 1]) {
  const s = sd < 0 ? 'left' : 'right';
  const ax = sd * shoulderX;
  add(`${s}-upper-arm`, seg(ax, elbowZ + 15, shoulderZ - 30, 50, 58)
    .union(seg(ax, shoulderZ - 110, shoulderZ + 20, 92, 80, 6)).color(armour));
  add(`${s}-forearm`, seg(ax, wristZ + 20, elbowZ - 10, 44, 54)
    .union(seg(ax, elbowZ - 30, elbowZ + 25, 58, 58))
    .union(blk(ax - 40, -45, wristZ - 120, ax + 40, 45, wristZ + 25)).color(leather));
  add(`${s}-gauntlet`, seg(ax, wristZ - 10, wristZ + 110, 58, 50).color(armour));
  fix(`${s}-forearm`, `${s}-gauntlet`, at(ax, 0, wristZ + 50));
  hinge('chest', `${s}-upper-arm`, `${s}-shoulder`, at(ax, 0, shoulderZ - 30), [1, 0, 0], [-170, 60]);
  hinge(`${s}-upper-arm`, `${s}-forearm`, `${s}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-140, 0]);

  const lx = sd * hipX;
  add(`${s}-thigh`, seg(lx, kneeZ + 20, hipZ, 62, 82).color(armour));
  add(`${s}-shin`, seg(lx, ankleZ, kneeZ - 20, 48, 62)
    .union(seg(lx, kneeZ - 40, kneeZ + 40, 70, 64, 6))
    .union(blk(lx - 55, -170, 0, lx + 55, 70, ankleZ + 20)).color(armour));
  hinge('pelvis', `${s}-thigh`, `${s}-hip`, at(lx, 0, hipZ), [1, 0, 0], [-100, 45]);
  hinge(`${s}-thigh`, `${s}-shin`, `${s}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 130]);
}

// Right hand weapon, held point up, fastened to the right forearm.
const hx = shoulderX;
const gripZ = wristZ - 70;
if (weapon.value === 'sword') {
  add('sword', blk(hx - 15, -120, gripZ - 70, hx + 15, -60, gripZ + 70)
    .union(blk(hx - 90, -105, gripZ + 60, hx + 90, -70, gripZ + 90))
    .union(extrudePolygon([[-35, 0], [35, 0], [25, 700], [0, 780], [-25, 700]], 12).rotateX(90).translate(hx, -84, gripZ + 85))
    .color(armour));
  fix('right-forearm', 'sword', at(hx, -60, gripZ));
} else if (weapon.value === 'spear') {
  add('sword', seg(0, gripZ - 700, gripZ + 1100, 18, 18, 6).translate(hx, -70, 0)
    .union(extrudePolygon([[-45, 0], [45, 0], [0, 260]], 14).rotateX(90).translate(hx, -63, gripZ + 1090))
    .color(leather));
  fix('right-forearm', 'sword', at(hx, -60, gripZ));
}
if (shieldOn.value === 'yes') {
  const shieldPts: [number, number][] = [[-230, 0], [230, 0], [230, -260], [120, -480], [0, -560], [-120, -480], [-230, -260]];
  const plate = (scale: number, t: number) =>
    extrudePolygon(shieldPts.map(([x, z]) => [x * scale, z * scale] as [number, number]), t).rotateX(90).rotateZ(90);
  add('shield', plate(1, 40).translate(-shoulderX - 100, 0, elbowZ + 80).color(tabard));
  add('shield-rim', plate(0.35, 12).translate(-shoulderX - 112, 0, elbowZ - 60).color(trim));
  fix('left-forearm', 'shield', at(-shoulderX - 60, 0, wristZ + 80));
  fix('shield', 'shield-rim', at(-shoulderX - 106, 0, elbowZ - 160));
}

return r.model();
