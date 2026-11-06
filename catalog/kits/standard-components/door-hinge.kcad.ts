// Upright butt-hinge leaves carry alternating knuckle bands around a removable pin; face screws make the mounting pattern visible.
meta({
  name: 'door-hinge',
  license: 'CC0-1.0',
  title: 'Door hinge',
  description: 'Upright butt hinge with alternating barrel knuckles, a brass pivot pin and visible leaf fasteners. Knobs: model size, steel, brass and fasteners.',
  tags: ['door hinge', 'butt hinge', 'cabinet hardware', 'pivot'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1600,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#52778e', { label: 'Steel' });
const brass = param('brass', '#c38b3d', { label: 'Brass' });
const fasteners = param('fasteners', '#d1d7d9', { label: 'Fasteners' });
presets({
  dark: { steel: '#3e484e', brass: '#725938', fasteners: '#20272b' },
  brass: { steel: '#646f75', brass: '#c0944d', fasteners: '#b0804d' },
  weathered: { steel: '#665b4d', brass: '#8c734d', fasteners: '#51473b' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('door-hinge');
const mountLeaf = (name: 'left' | 'right', x0: number, holeXs: number[]) => {
  let leaf = block(x0 * s, -2 * s, 0, 28 * s, 4 * s, 40 * s);
  for (const x of holeXs) {
    for (const z of [8, 20, 32]) {
      leaf = leaf.subtract(cylinder(5 * s, 2.1 * s, 10)
        .rotateX(90).translate(x * s, 2.5 * s, z * s));
    }
  }
  a.part(`${name}-leaf`, leaf.color(steel));
  for (const [i, x] of holeXs.entries()) {
    for (const [j, z] of [8, 20, 32].entries()) {
      a.part(`${name}-fastener-${i + 1}-${j + 1}`, cylinder(0.95 * s, 2.3 * s, 10)
        .rotateX(90).translate(x * s, 2.55 * s, z * s).color(fasteners));
    }
  }
};

// The leaves stand in the XZ plane, with their barrel edges meeting the pivot axis.
mountLeaf('left', -32, [-25, -13]);
mountLeaf('right', 4, [13, 25]);

const leftKnuckles: [number, number][] = [[0, 7.7], [16.15, 23.85], [32.3, 40]];
const rightKnuckles: [number, number][] = [[8.15, 15.85], [24.15, 31.85]];
for (const [i, [z0, z1]] of leftKnuckles.entries()) {
  a.part(`left-knuckle-${i + 1}`, cylinder((z1 - z0) * s, 5 * s, 12)
    .translate(0, 0, z0 * s).color(steel));
}
for (const [i, [z0, z1]] of rightKnuckles.entries()) {
  a.part(`right-knuckle-${i + 1}`, cylinder((z1 - z0) * s, 5 * s, 12)
    .translate(0, 0, z0 * s).color(steel));
}
a.part('brass-pivot-pin', cylinder(40 * s, 1.8 * s, 12).translate(0, 0, 0).color(brass));
return a.model();
