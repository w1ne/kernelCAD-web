// Original kernelCAD low-poly humanoid robot: box links joined by revolute
// mates (neck, shoulders, elbows, hips, knees), so the GLB carries a node
// hierarchy with one pivot per joint. Every link is authored in its standing
// pose and each joint connector sits at the same point on both links, so the
// zero pose is the as-built pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'robot-humanoid',
  license: 'CC0-1.0',
  title: 'Humanoid robot',
  description: 'Boxy two-legged service robot with a jointed neck, shoulders, elbows, hips and knees rigged as GLB pivots. Knobs: build, antenna, body, trim, visor and joint colours.',
  tags: ['robot', 'humanoid', 'android', 'mech', 'character', 'npc', 'rigged', 'toy'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character'],
  triangleBudget: 700,
});

const build = param('build', 'standard', { choices: ['slim', 'standard', 'bulky'], label: 'Build' });
const antenna = param('antenna', 'yes', { choices: ['yes', 'no'], label: 'Antenna' });
const body = param('body', '#d9dde2', { label: 'Body' });
const trim = param('trim', '#e2702a', { label: 'Trim' });
const visor = param('visor', '#2ec7e6', { label: 'Visor' });
const joint = param('joint', '#3a3f45', { label: 'Joints' });

presets({
  security: { body: '#2b3036', trim: '#c9302c', visor: '#ff4a3d' },
  retro: { body: '#b8a27a', trim: '#7a5230', visor: '#f2d04b', antenna: 'yes' },
});

const k = build.value === 'slim' ? 0.85 : build.value === 'bulky' ? 1.2 : 1;
const r = assembly('robot-humanoid');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };

// Heights (z of each joint) and half-widths.
const footH = 60;
const kneeZ = 330;
const hipZ = 640;
const waistZ = 720;
const shoulderZ = 1080;
const neckZ = 1150;
const hipX = 90 * k;
const shoulderX = 200 * k;
const legW = 90 * k;
const armW = 70 * k;

// Joint axis connector shared by the two links of one joint.
const pivot = (z: number, x: number, y = 0) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, at: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: at, axis });
  refs[child].connector(name, { type: 'axis', origin: at, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};

// Torso: pelvis + chest as one link, with a chest plate and a joint band.
const torso = box(260 * k, 170 * k, 120, true).translate(0, 0, (hipZ + waistZ) / 2)
  .union(
    box(340 * k, 200 * k, shoulderZ + 40 - waistZ, true).translate(0, 0, (waistZ + shoulderZ + 40) / 2),
  );
add('torso', torso.color(body));
add('chest-plate', box(200 * k, 20, 180, true).translate(0, -100 * k - 10, 960).color(trim));
refs.torso.connector('plate', { type: 'frame', origin: pivot(960, 0, -100 * k) });
refs['chest-plate'].connector('plate', { type: 'frame', origin: pivot(960, 0, -100 * k) });
r.mate('chest-plate', 'torso.plate', 'chest-plate.plate', 'fastened');

// Head: block with a visor and an optional antenna; yaws on the neck.
let head = box(200 * k, 190, 170, true).translate(0, 0, neckZ + 30 + 85)
  .union(cylinder(30, 50).translate(0, 0, neckZ));
if (antenna.value === 'yes') head = head.union(cylinder(110, 8).translate(60 * k, 30, neckZ + 200));
add('head', head.color(body));
add('visor', box(170 * k, 16, 50, true).translate(0, -95 - 8, neckZ + 130).color(visor));
refs.head.connector('visor', { type: 'frame', origin: pivot(neckZ + 130, 0, -95) });
refs.visor.connector('visor', { type: 'frame', origin: pivot(neckZ + 130, 0, -95) });
r.mate('visor', 'head.visor', 'visor.visor', 'fastened');
hinge('torso', 'head', 'neck', pivot(neckZ, 0), [0, 0, 1], [-80, 80]);

// Arms: upper arm swings at the shoulder, forearm + hand at the elbow.
const elbowZ = 800;
for (const side of [-1, 1]) {
  const s = side < 0 ? 'left' : 'right';
  const x = side * (shoulderX + armW / 2);
  add(`${s}-upper-arm`, box(armW, armW, shoulderZ - elbowZ, true).translate(x, 0, (shoulderZ + elbowZ) / 2)
    .union(box(armW + 30, armW + 30, 60, true).translate(x, 0, shoulderZ - 10)).color(trim));
  add(`${s}-forearm`, box(armW - 10, armW - 10, 240, true).translate(x, 0, elbowZ - 120)
    .union(box(armW + 10, armW - 20, 90, true).translate(x, 0, elbowZ - 285)).color(body));
  hinge('torso', `${s}-upper-arm`, `${s}-shoulder`, pivot(shoulderZ - 20, side * shoulderX), [1, 0, 0], [-170, 60]);
  hinge(`${s}-upper-arm`, `${s}-forearm`, `${s}-elbow`, pivot(elbowZ, x), [1, 0, 0], [-140, 0]);
}

// Legs: thigh at the hip, shin + foot at the knee.
for (const side of [-1, 1]) {
  const s = side < 0 ? 'left' : 'right';
  const x = side * hipX;
  add(`${s}-thigh`, box(legW, legW, hipZ - kneeZ, true).translate(x, 0, (hipZ + kneeZ) / 2).color(joint));
  add(`${s}-shin`, box(legW - 10, legW - 10, kneeZ - footH, true).translate(x, 0, (kneeZ + footH) / 2)
    .union(box(legW + 20, 200, footH, true).translate(x, -30, footH / 2))
    .union(box(legW + 20, legW + 20, 50, true).translate(x, 0, kneeZ - 10)).color(body));
  hinge('torso', `${s}-thigh`, `${s}-hip`, pivot(hipZ - 20, x), [1, 0, 0], [-100, 45]);
  hinge(`${s}-thigh`, `${s}-shin`, `${s}-knee`, pivot(kneeZ, x), [1, 0, 0], [0, 130]);
}

return r.model();
