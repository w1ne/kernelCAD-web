// Original kernelCAD low-poly wheeled robot: a chassis on four (or six)
// faceted wheels that spin on revolute mates, with a camera head on a mast
// that pans and tilts. Pose 0 is the as-built pose.
// Millimetres, Z up, wheels on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'rover-robot',
  license: 'CC0-1.0',
  title: 'Rover robot',
  description: 'Wheeled scout robot with spinning wheels and a pan-tilt camera head on a mast, rigged as GLB pivots. Knobs: wheel count, mast height, body, trim, tyre and lens colours.',
  tags: ['robot', 'rover', 'wheeled robot', 'drone', 'scout', 'vehicle', 'mech', 'rigged', 'toy'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character', 'vehicle'],
  triangleBudget: 950,
});

const wheels = param('wheels', '4', { choices: ['4', '6'], label: 'Wheels' });
const mast = param('mast', 'tall', { choices: ['short', 'tall'], label: 'Mast' });
const body = param('body', '#e8e2d4', { label: 'Body' });
const trim = param('trim', '#3b7dd8', { label: 'Trim' });
const tyre = param('tyre', '#26282b', { label: 'Tyres' });
const lens = param('lens', '#ff5a36', { label: 'Lens' });

presets({
  mars: { body: '#c9a27a', trim: '#7a4b2a', lens: '#46e0ff' },
  police: { body: '#1d2b44', trim: '#eef0f2', lens: '#ff3b30' },
});

const r = assembly('rover-robot');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};

const wheelR = 110;
const wheelW = 70;
const chassisW = 320;
const chassisL = wheels.value === '6' ? 620 : 480;
const chassisZ = wheelR + 40;
const chassisH = 120;
const mastH = mast.value === 'tall' ? 380 : 200;
const deckZ = chassisZ + chassisH / 2;

add('chassis', box(chassisW, chassisL, chassisH, true).translate(0, 0, chassisZ)
  .union(box(chassisW - 60, chassisL - 80, 40, true).translate(0, 0, deckZ + 20))
  .color(body));
add('bumper', box(chassisW + 20, 40, 50, true).translate(0, -chassisL / 2 - 20, chassisZ - 20)
  .union(box(chassisW + 20, 40, 50, true).translate(0, chassisL / 2 + 20, chassisZ - 20)).color(trim));
refs.chassis.connector('bumper', { type: 'frame', origin: at(0, 0, chassisZ - 20) });
refs.bumper.connector('bumper', { type: 'frame', origin: at(0, 0, chassisZ - 20) });
r.mate('bumper', 'chassis.bumper', 'bumper.bumper', 'fastened');

// Wheels: octagonal tyres with a hub cap, spinning about X.
const axleYs = wheels.value === '6' ? [-220, 0, 220] : [-160, 160];
for (const y of axleYs) {
  for (const side of [-1, 1]) {
    const name = `wheel-${side < 0 ? 'l' : 'r'}${axleYs.indexOf(y) + 1}`;
    const x = side * (chassisW / 2 + wheelW / 2 + 10);
    const tyreShape = cylinder(wheelW, wheelR).rotateY(90).translate(x - wheelW / 2, y, wheelR);
    const cap = cylinder(12, wheelR * 0.45).rotateY(90).translate(side < 0 ? x - wheelW / 2 - 12 : x + wheelW / 2, y, wheelR);
    add(name, tyreShape.union(cap).color(tyre));
    hinge('chassis', name, `${name}-spin`, at(side * (chassisW / 2), y, wheelR), [1, 0, 0], [-180, 180]);
  }
}

// Mast pans about Z on the deck; the head tilts about X at the mast top.
const mastY = -chassisL / 2 + 110;
add('mast', cylinder(mastH, 24).translate(0, mastY, deckZ + 40)
  .union(box(80, 80, 30, true).translate(0, mastY, deckZ + 55)).color(trim));
hinge('chassis', 'mast', 'pan', at(0, mastY, deckZ + 40), [0, 0, 1], [-170, 170]);
const headZ = deckZ + 40 + mastH;
add('head', box(200, 110, 90, true).translate(0, mastY, headZ + 45)
  .union(box(140, 30, 20, true).translate(0, mastY, headZ + 100)).color(body));
add('lenses', cylinder(20, 26).rotateX(90).translate(-50, mastY - 55, headZ + 50)
  .union(cylinder(20, 26).rotateX(90).translate(50, mastY - 55, headZ + 50)).color(lens));
refs.head.connector('lenses', { type: 'frame', origin: at(0, mastY - 55, headZ + 50) });
refs.lenses.connector('lenses', { type: 'frame', origin: at(0, mastY - 55, headZ + 50) });
r.mate('lenses', 'head.lenses', 'lenses.lenses', 'fastened');
hinge('mast', 'head', 'tilt', at(0, mastY, headZ), [1, 0, 0], [-40, 40]);

return r.model();
