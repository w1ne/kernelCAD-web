// Original kernelCAD low-poly crab robot: a wide faceted shell on six bent
// walking legs, two big pincer arms whose shoulders swing and whose fingers
// snap, and a pair of eye stalks that nod. Every joint is a revolute mate;
// pose 0 is the as-built pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'crab-bot',
  license: 'CC0-1.0',
  title: 'Crab bot',
  description: 'Sideways-walking crab robot with a wide shell, snapping pincers, nodding eye stalks and six legs, rigged as GLB pivots. Knobs: size, claw size, shell, limb, eye and belly colours.',
  tags: ['robot', 'crab', 'crustacean', 'beach', 'animal', 'enemy', 'mech', 'rigged', 'toy'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character', 'beach'],
  triangleBudget: 900,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const claws = param('claws', 'big', { choices: ['small', 'big'], label: 'Claw size' });
const shell = param('shell', '#e0532f', { label: 'Shell' });
const limb = param('limb', '#f08a5a', { label: 'Legs and claws' });
const eyes = param('eyes', '#20232a', { label: 'Eyes' });
const belly = param('belly', '#f4d9b0', { label: 'Belly' });

presets({
  blue: { shell: '#2f6fb8', limb: '#5a9ad8', belly: '#dfe8ef' },
  steel: { shell: '#7d848c', limb: '#4a5058', eyes: '#ff3b30', belly: '#2b2f33' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.6 : 1;
const cs = claws.value === 'big' ? 1.25 : 0.85;
const r = assembly('crab-bot');
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
// Square rod from p0 to p1 (mm, unscaled).
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w / 2, -w / 2).lineTo(w / 2, -w / 2).lineTo(w / 2, w / 2).lineTo(-w / 2, w / 2).close();
  return sq(w0 * s).loft(sq(w1 * s), { spacing: len * s, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0] * s, p0[1] * s, p0[2] * s);
};
// Shell outline: a wide hexagon-ish crab carapace, scaled per ring.
const outline = (k: number) => {
  const pts: [number, number][] = [[-200, 10], [-150, -110], [0, -130], [150, -110], [200, 10], [130, 110], [-130, 110]];
  let p = path().moveTo(pts[0][0] * k * s, pts[0][1] * k * s);
  for (const [x, y] of pts.slice(1)) p = p.lineTo(x * k * s, y * k * s);
  return p.close();
};

add('belly', outline(0.8).extrude(50 * s).translate(0, 0, 80 * s).color(belly));
add('shell', outline(0.9).loft([outline(1), outline(0.6)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 125 * s] },
    { plane: 'XY', origin: [0, 0, 160 * s] },
    { plane: 'XY', origin: [0, 0, 225 * s] },
  ],
  ruled: true,
}).color(shell));
fix('shell', 'belly', at(0, 0, 128));

// Eye stalks on one bar so they nod together.
add('eyes', rod([-45, -80, 160], [-45, -105, 290], 18, 16).union(rod([45, -80, 160], [45, -105, 290], 18, 16))
  .union(box(110 * s, 24 * s, 24 * s, true).translate(0, -80 * s, 165 * s))
  .union(box(40 * s, 40 * s, 40 * s, true).translate(-45 * s, -105 * s, 300 * s))
  .union(box(40 * s, 40 * s, 40 * s, true).translate(45 * s, -105 * s, 300 * s)).color(eyes));
hinge('shell', 'eyes', 'eye-nod', at(0, -80, 165), [1, 0, 0], [-30, 30]);

// Pincer arms: an arm with the fixed jaw swings at the shoulder; the moving
// finger snaps about Z at the wrist.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const sh: [number, number, number] = [sd * 150, -110, 140];
  const wr: [number, number, number] = [sd * 210, -250, 160];
  const palmL = 130 * cs;
  const jaw = extrudePolygon([[0, 0], [sd * 70 * cs, 0], [sd * 50 * cs, -palmL], [sd * 20 * cs, -palmL * 0.8]], 60 * cs)
    .scale([s, s, s]).translate(wr[0] * s, wr[1] * s, (wr[2] - 30 * cs) * s);
  add(`${nm}-arm`, rod([sd * 120, -80, 140], wr, 46, 40).union(jaw)
    .union(box(90 * cs * s, 60 * cs * s, 70 * cs * s, true).translate((wr[0] + sd * 30 * cs) * s, wr[1] * s, wr[2] * s)).color(limb));
  hinge('shell', `${nm}-arm`, `${nm}-shoulder`, at(...sh), [0, 0, 1], sd < 0 ? [-40, 30] : [-30, 40]);
  const finger = extrudePolygon([[0, 0], [-sd * 34 * cs, 10], [-sd * 20 * cs, -palmL * 0.95], [0, -palmL * 0.7]], 46 * cs)
    .scale([s, s, s]).translate(wr[0] * s, wr[1] * s, (wr[2] - 23 * cs) * s);
  add(`${nm}-finger`, finger.color(limb));
  hinge(`${nm}-arm`, `${nm}-finger`, `${nm}-pincer`, at(...wr), [0, 0, 1], sd < 0 ? [0, 35] : [-35, 0]);
}

// Six walking legs, three a side, bent at a knee and lifting about Y.
for (const sd of [-1, 1]) {
  for (let i = 0; i < 3; i++) {
    const y = -40 + i * 65;
    const nm = `leg-${sd < 0 ? 'l' : 'r'}${i + 1}`;
    const hip: [number, number, number] = [sd * 150, y, 110];
    const knee: [number, number, number] = [sd * 270, y + 20 * i, 190];
    const foot: [number, number, number] = [sd * 330, y + 30 * i, 12];
    add(nm, rod([sd * 130, y, 110], knee, 30, 26).union(rod(knee, foot, 26, 14))
      .union(box(34 * s, 34 * s, 34 * s, true).translate(knee[0] * s, knee[1] * s, knee[2] * s))
      .union(box(24 * s, 24 * s, 16 * s, true).translate(foot[0] * s, foot[1] * s, 8 * s)).color(limb));
    hinge('shell', nm, `${nm}-hip`, at(...hip), [0, 1, 0], [-25, 25]);
  }
}

return r.model();
