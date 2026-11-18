// Original kernelCAD low-poly penguin: a faceted egg body with a white belly,
// a turning head with eyes and an opening beak, flapping flippers, waddling
// feet and a little tail, all rigged through revolute mates. Each joint
// connector sits at the same point on both links, so pose 0 is as built.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'penguin',
  license: 'CC0-1.0',
  title: 'Penguin',
  description: 'Waddling low-poly penguin with a faceted egg body, white belly, turning head, opening beak, flapping flippers and feet, rigged as GLB pivots. Knobs: size, crest, back, belly, beak and eye colours.',
  tags: ['penguin', 'bird', 'antarctic', 'arctic', 'snow', 'ice', 'zoo', 'animal', 'rigged', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'snow', 'winter', 'zoo', 'outdoor'],
  triangleBudget: 600,
});

const size = param('size', 'medium', { choices: ['chick', 'medium', 'emperor'], label: 'Size' });
const crest = param('crest', 'no', { choices: ['no', 'yes'], label: 'Crest' });
const back = param('back', '#23262c', { label: 'Back and head' });
const belly = param('belly', '#f4f2ec', { label: 'Belly and eyes' });
const beak = param('beak', '#f29a2e', { label: 'Beak and feet' });
const eye = param('eye', '#121214', { label: 'Pupils' });

presets({
  rockhopper: { crest: 'yes', beak: '#d8342c' },
  chick: { size: 'chick', back: '#8a8f96', belly: '#d9dcdf' },
});

const s = size.value === 'chick' ? 0.5 : size.value === 'emperor' ? 1.6 : 1;
const r = assembly('penguin');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x * s, y * s, z * s] as [number, number, number] });
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
const ngon = (rad: number, n: number, rot = 0) => {
  let p = path().moveTo(rad * s * Math.cos(rot), rad * s * Math.sin(rot));
  for (let i = 1; i < n; i++) {
    const a = rot + (2 * Math.PI * i) / n;
    p = p.lineTo(rad * s * Math.cos(a), rad * s * Math.sin(a));
  }
  return p.close();
};
// Faceted stack of rings [radius, z], alternate rings turned half a facet.
const stack = (rings: [number, number][], n: number, alt = true) =>
  ngon(rings[0][0], n, Math.PI / n).loft(rings.slice(1).map(([rr], i) => ngon(rr, n, alt && i % 2 === 0 ? 0 : Math.PI / n)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });
// Side-profile prism: points are (y, z), thickness t starting at x0.
const side = (pts: [number, number][], t: number, x0 = -t / 2) =>
  extrudePolygon(pts.map(([y, z]) => [y * s, z * s] as [number, number]), t * s).rotateX(90).rotateZ(90).translate(x0 * s, 0, 0);

add('body', stack([[130, 50], [195, 160], [205, 340], [160, 500], [110, 590]], 8, false).scale([1, 0.85, 1]).color(back));
add('belly', stack([[115, 55], [180, 160], [190, 340], [140, 490], [80, 560]], 8, false).scale([0.8, 0.8, 1]).translate(0, -42 * s, 0).color(belly));
fix('body', 'belly', at(0, -100, 300));
add('tail', side([[120, 90], [230, 40], [220, 20], [110, 60]], 90).color(back));
hinge('body', 'tail', 'tail-wag', at(0, 120, 75), [0, 0, 1], [-30, 30]);

// Head turns about Z on top of the body.
let head = stack([[105, 570], [125, 650], [110, 740], [55, 790]], 7);
if (crest.value === 'yes') {
  head = head.union(side([[-40, 760], [40, 760], [90, 830], [20, 800], [-10, 850], [-30, 790]], 40));
}
add('head', head.color(back));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-eye`, box(36 * s, 30 * s, 40 * s, true).translate(sd * 55 * s, -100 * s, 690 * s).color(belly));
  fix('head', `${nm}-eye`, at(sd * 55, -100, 690));
  add(`${nm}-pupil`, box(18 * s, 10 * s, 20 * s, true).translate(sd * 55 * s, -118 * s, 690 * s).color(eye));
  fix(`${nm}-eye`, `${nm}-pupil`, at(sd * 55, -116, 690));
}
add('beak', side([[-100, 660], [-200, 645], [-100, 680]], 50).color(beak));
fix('head', 'beak', at(0, -105, 660));
add('jaw', side([[-100, 640], [-180, 640], [-100, 660]], 40).color(beak));
hinge('head', 'jaw', 'beak-open', at(0, -100, 650), [1, 0, 0], [-30, 0]);
hinge('body', 'head', 'neck', at(0, 0, 580), [0, 0, 1], [-90, 90]);

// Flippers flap about Y at the shoulders.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x0 = sd < 0 ? -205 - 20 : 195;
  add(`${nm}-flipper`, side([[-60, 470], [50, 480], [60, 380], [20, 200], [-20, 250], [-50, 380]], 30, x0)
    .color(back));
  hinge('body', `${nm}-flipper`, `${nm}-shoulder`, at(sd * 200, 0, 470), [0, 1, 0], sd < 0 ? [-10, 70] : [-70, 10]);
}

// Webbed feet waddle about X at the ankle.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x = sd * 75;
  const foot = extrudePolygon([[-25, 40], [25, 40], [55, -90], [20, -80], [0, -110], [-20, -80], [-55, -90]], 30)
    .scale([s, s, s]).translate(x * s, -40 * s, 0);
  add(`${nm}-foot`, foot.union(box(50 * s, 50 * s, 60 * s, true).translate(x * s, -10 * s, 50 * s)).color(beak));
  hinge('body', `${nm}-foot`, `${nm}-ankle`, at(x, -10, 60), [1, 0, 0], [-30, 30]);
}

return r.model();
