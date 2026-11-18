// Original kernelCAD low-poly wheeled service droid: a chamfered box body on
// two drive wheels and a rear caster, a cream front panel with a status
// screen, a flat-topped sensor head with a camera bar on a panning neck post,
// a folding antenna and two arms with shoulder and elbow pivots. Every joint
// is a revolute mate; pose 0 is the as-built pose.
// Millimetres, Z up, wheels on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'wheeled-droid',
  license: 'CC0-1.0',
  title: 'Wheeled droid',
  description: 'Boxy service droid on two drive wheels with a flat sensor head and camera bar that pans and tilts, a folding antenna and two jointed arms, rigged as GLB pivots. Knobs: height, arms, body, panel, dark trim and lens colours.',
  tags: ['robot', 'droid', 'service robot', 'helper', 'wheeled robot', 'sci-fi', 'mech', 'rigged', 'npc', 'toy'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character', 'interior'],
  triangleBudget: 800,
});

const height = param('height', 'medium', { choices: ['short', 'medium', 'tall'], label: 'Height' });
const arms = param('arms', 'yes', { choices: ['yes', 'no'], label: 'Arms' });
const body = param('body', '#e8742a', { label: 'Body' });
const panel = param('panel', '#f2e6cf', { label: 'Front panel and head' });
const dark = param('dark', '#2e2b28', { label: 'Tyres, arms and camera bar' });
const lens = param('lens', '#ffd04a', { label: 'Lenses and screen' });

presets({
  teal: { body: '#2f9c95', panel: '#f0e8d6', lens: '#ff8a3a' },
  mustard: { body: '#d9a62a', panel: '#f4efe4', dark: '#3a3530', lens: '#7cff6b' },
});

const k = height.value === 'short' ? 0.75 : height.value === 'tall' ? 1.3 : 1;
const r = assembly('wheeled-droid');
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
// Chamfered rectangle w (X) by d (Y), corners cut by c.
const crect = (w: number, d: number, c: number) => {
  const a = w / 2;
  const b = d / 2;
  return path().moveTo(-a + c, -b).lineTo(a - c, -b).lineTo(a, -b + c).lineTo(a, b - c)
    .lineTo(a - c, b).lineTo(-a + c, b).lineTo(-a, b - c).lineTo(-a, -b + c).close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const wheelR = 120;
const W = 360;
const D = 300;
const z0 = 80;
const z1 = z0 + 480 * k;
// Body tapers slightly toward the shoulders.
add('body', crect(W - 40, D - 40, 40).loft([crect(W, D, 50), crect(W, D, 50), crect(W - 60, D - 40, 50)], {
  planes: [
    { plane: 'XY', origin: [0, 0, z0] },
    { plane: 'XY', origin: [0, 0, z0 + 50] },
    { plane: 'XY', origin: [0, 0, z1 - 50] },
    { plane: 'XY', origin: [0, 0, z1] },
  ],
  ruled: true,
}).union(blk(-50, 90, 20, 50, 150, z0 + 60)).color(body));
add('front-panel', blk(-120, -D / 2 - 12, z0 + 70, 120, -D / 2 + 20, z1 - 70).color(panel));
fix('body', 'front-panel', at(0, -D / 2, (z0 + z1) / 2));
add('screen', blk(-80, -D / 2 - 20, z1 - 200 * k, 80, -D / 2 - 6, z1 - 110 * k).color(lens));
fix('front-panel', 'screen', at(0, -D / 2 - 12, z1 - 150 * k));
add('caster', cylinder(36, 38).rotateY(90).translate(-18, 120, 38).color(dark));
hinge('body', 'caster', 'caster-spin', at(0, 120, 38), [1, 0, 0], [-180, 180]);

// Drive wheels each side, spinning about X.
for (const sd of [-1, 1]) {
  const nm = `wheel-${sd < 0 ? 'left' : 'right'}`;
  const x = sd * (W / 2 + 40);
  add(nm, cylinder(60, wheelR).rotateY(90).translate(x - 30, -20, wheelR)
    .union(cylinder(30, 30).rotateY(90).translate(sd < 0 ? x + 20 : x - 50, -20, wheelR)).color(dark));
  hinge('body', nm, `${nm}-spin`, at(sd * W / 2, -20, wheelR), [1, 0, 0], [-180, 180]);
}

// Neck post pans about Z; the flat sensor head tilts about X on it.
add('neck', cylinder(90, 40).translate(0, 0, z1 - 10).union(blk(-60, -40, z1 + 70, 60, 40, z1 + 100)).color(dark));
hinge('body', 'neck', 'head-pan', at(0, 0, z1), [0, 0, 1], [-170, 170]);
const hz = z1 + 100;
add('head', crect(320, 200, 30).extrude(140).translate(0, 0, hz)
  .union(blk(-130, -80, hz + 140, 130, 80, hz + 160)).color(panel));
add('camera-bar', blk(-150, -112, hz + 40, 150, -90, hz + 100).color(dark));
fix('head', 'camera-bar', at(0, -100, hz + 70));
for (const sd of [-1, 1]) {
  const nm = `lens-${sd < 0 ? 'left' : 'right'}`;
  add(nm, blk(sd * 70 - 30, -122, hz + 50, sd * 70 + 30, -108, hz + 90).color(lens));
  fix('camera-bar', nm, at(sd * 70, -112, hz + 70));
}
hinge('neck', 'head', 'head-tilt', at(0, 0, hz), [1, 0, 0], [-25, 35]);

// Antenna folds back about X from the head top.
add('antenna', blk(95, 40, hz + 150, 115, 60, hz + 330).union(blk(85, 30, hz + 320, 125, 70, hz + 350)).color(body));
hinge('head', 'antenna', 'antenna-fold', at(105, 50, hz + 155), [1, 0, 0], [0, 90]);

if (arms.value === 'yes') {
  for (const sd of [-1, 1]) {
    const nm = sd < 0 ? 'left' : 'right';
    const ax = sd * (W / 2 + 10);
    const sh = z1 - 80 * k;
    const el = sh - 200;
    add(`${nm}-upper-arm`, blk(ax - 30, -30, el, ax + 30, 30, sh + 30).union(blk(ax - 45, -45, sh - 20, ax + 45, 45, sh + 50)).color(dark));
    add(`${nm}-forearm`, blk(ax - 26, -200, el - 26, ax + 26, 26, el + 26)
      .union(blk(ax - 40, -250, el - 30, ax - 18, -190, el + 30))
      .union(blk(ax + 18, -250, el - 30, ax + 40, -190, el + 30)).color(panel));
    hinge('body', `${nm}-upper-arm`, `${nm}-shoulder`, at(ax, 0, sh), [1, 0, 0], [-120, 60]);
    hinge(`${nm}-upper-arm`, `${nm}-forearm`, `${nm}-elbow`, at(ax, 0, el), [1, 0, 0], [-60, 80]);
  }
}

return r.model();
