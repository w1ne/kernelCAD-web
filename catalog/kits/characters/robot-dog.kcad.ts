// Original kernelCAD low-poly quadruped robot: a box body on four two-link
// legs (hip and knee pivots), a head on a pitching neck and a wagging tail,
// all rigged through revolute mates. Links are authored standing; each joint
// connector sits at the same point on both links, so pose 0 is as built.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'robot-dog',
  license: 'CC0-1.0',
  title: 'Robot dog',
  description: 'Four-legged robot dog with hip, knee, neck and tail pivots rigged as GLB nodes. Knobs: size, ears, body, panel, eye and joint colours.',
  tags: ['robot', 'dog', 'quadruped', 'pet', 'animal', 'mech', 'rigged', 'toy'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character'],
  triangleBudget: 600,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const ears = param('ears', 'pointed', { choices: ['pointed', 'none'], label: 'Ears' });
const body = param('body', '#f0c419', { label: 'Body' });
const panel = param('panel', '#2b2f33', { label: 'Panels' });
const eyes = param('eyes', '#46e0ff', { label: 'Eyes' });
const joint = param('joint', '#55595e', { label: 'Joints' });

presets({
  stealth: { body: '#3a3f45', panel: '#1b1d20', eyes: '#ff3b30' },
  white: { body: '#eef0f2', panel: '#9aa3ab', eyes: '#2fbf5a' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.35 : 1;
const r = assembly('robot-dog');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};

const bodyL = 520 * s;
const bodyW = 220 * s;
const bodyH = 150 * s;
const hipZ = 330 * s;
const kneeZ = 170 * s;
const legW = 50 * s;
const bodyZ = hipZ + bodyH / 2 - 20 * s;

add('body', box(bodyW, bodyL, bodyH, true).translate(0, 0, bodyZ)
  .union(box(bodyW - 40 * s, bodyL - 120 * s, 30 * s, true).translate(0, 0, bodyZ + bodyH / 2 + 15 * s))
  .color(body));
add('back-panel', box(bodyW - 60 * s, bodyL - 200 * s, 12 * s, true).translate(0, 0, bodyZ + bodyH / 2 + 36 * s).color(panel));
refs.body.connector('panel', { type: 'frame', origin: at(0, 0, bodyZ + bodyH / 2 + 30 * s) });
refs['back-panel'].connector('panel', { type: 'frame', origin: at(0, 0, bodyZ + bodyH / 2 + 30 * s) });
r.mate('back-panel', 'body.panel', 'back-panel.panel', 'fastened');

// Head on a short neck block that pitches at the front of the body.
const neckY = -bodyL / 2;
const neckZ = bodyZ + bodyH / 2 - 10 * s;
let head = box(150 * s, 170 * s, 120 * s, true).translate(0, neckY - 110 * s, neckZ + 60 * s)
  .union(box(100 * s, 90 * s, 70 * s, true).translate(0, neckY - 230 * s, neckZ + 35 * s))
  .union(box(70 * s, 60 * s, 60 * s, true).translate(0, neckY - 20 * s, neckZ + 10 * s));
if (ears.value === 'pointed') {
  for (const side of [-1, 1]) {
    head = head.union(extrudePolygon([[-25 * s, 0], [25 * s, 0], [0, 70 * s]], 16 * s)
      .rotateX(90).translate(side * 50 * s, neckY - 90 * s, neckZ + 120 * s));
  }
}
add('head', head.color(body));
add('visor', box(130 * s, 12 * s, 36 * s, true).translate(0, neckY - 195 * s - 6 * s, neckZ + 80 * s).color(eyes));
refs.head.connector('visor', { type: 'frame', origin: at(0, neckY - 195 * s, neckZ + 80 * s) });
refs.visor.connector('visor', { type: 'frame', origin: at(0, neckY - 195 * s, neckZ + 80 * s) });
r.mate('visor', 'head.visor', 'visor.visor', 'fastened');
hinge('body', 'head', 'neck', at(0, neckY, neckZ), [1, 0, 0], [-35, 45]);

// Tail: a thin box that wags left/right at the rear.
const tailY = bodyL / 2;
add('tail', box(30 * s, 140 * s, 30 * s, true).rotateX(-25).translate(0, tailY + 60 * s, bodyZ + 60 * s).color(panel));
hinge('body', 'tail', 'tail-wag', at(0, tailY, bodyZ + 40 * s), [0, 0, 1], [-40, 40]);

// Legs: thigh at the hip, shin + paw at the knee; front and back pairs.
for (const [end, y] of [['front', -bodyL / 2 + 80 * s], ['back', bodyL / 2 - 80 * s]] as const) {
  for (const side of [-1, 1]) {
    const name = `${end}-${side < 0 ? 'left' : 'right'}`;
    const x = side * (bodyW / 2 + legW / 2);
    add(`${name}-thigh`, box(legW, legW + 10 * s, hipZ - kneeZ + 30 * s, true).translate(x, y, (hipZ + kneeZ) / 2).color(joint));
    add(`${name}-shin`, box(legW - 10 * s, legW - 10 * s, kneeZ, true).translate(x, y, kneeZ / 2)
      .union(box(legW + 10 * s, legW + 30 * s, 30 * s, true).translate(x, y - 8 * s, 15 * s)).color(body));
    hinge('body', `${name}-thigh`, `${name}-hip`, at(x, y, hipZ), [1, 0, 0], [-60, 60]);
    hinge(`${name}-thigh`, `${name}-shin`, `${name}-knee`, at(x, y, kneeZ), [1, 0, 0], end === 'front' ? [-110, 0] : [0, 110]);
  }
}

return r.model();
