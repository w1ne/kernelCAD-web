// Original kernelCAD low-poly storm drain: a concrete gully frame with a dark
// pit and an iron grate of bars, optionally with a kerb block carrying a dark
// inlet slot behind it. Millimetres, Z up, road side faces -Y.

meta({
  name: 'storm-drain',
  license: 'CC0-1.0',
  title: 'Storm drain',
  description: 'Roadside gully grate in a concrete frame with an optional kerb inlet. Knobs: grate bars, kerb inlet, concrete, grate and pit colours.',
  tags: ['drain', 'storm drain', 'gully', 'grate', 'gutter', 'sewer', 'road', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'road'],
  triangleBudget: 260,
});

const bars = param('bars', '7', { choices: ['5', '7', '9'], label: 'Grate bars' });
const kerb = param('kerb', 'yes', { choices: ['yes', 'no'], label: 'Kerb inlet' });
const concrete = param('concrete', '#9a9893', { label: 'Concrete' });
const grate = param('grate', '#3a3c3f', { label: 'Grate' });
const pit = param('pit', '#141516', { label: 'Pit' });

presets({
  rusty: { grate: '#6b4630' },
  dark: { concrete: '#5c5d60' },
});

const n = Number(bars.value);
const W = 760;
const D = 460;
const H = 100;
const iw = 600;
const id = 300;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const sd = assembly('storm-drain');
const yc = kerb.value === 'yes' ? -100 : 0;
sd.part('frame', blk(-W / 2, yc - D / 2, 0, W / 2, yc + D / 2, H)
  .subtract(blk(-iw / 2, yc - id / 2, 30, iw / 2, yc + id / 2, H + 10)).color(concrete));
sd.part('pit', blk(-iw / 2, yc - id / 2, 29, iw / 2, yc + id / 2, 40).color(pit));
sd.part('rail-front', blk(-iw / 2, yc - id / 2, 70, iw / 2, yc - id / 2 + 25, 95).color(grate));
sd.part('rail-back', blk(-iw / 2, yc + id / 2 - 25, 70, iw / 2, yc + id / 2, 95).color(grate));
const pitch = iw / n;
for (let i = 0; i < n; i++) {
  const x = -iw / 2 + pitch * (i + 0.5);
  sd.part(`bar-${i + 1}`, blk(x - pitch * 0.22, yc - id / 2, 60, x + pitch * 0.22, yc + id / 2, 95).color(grate));
}
if (kerb.value === 'yes') {
  const ky = yc + D / 2;
  sd.part('kerb', blk(-W / 2 - 100, ky, 0, W / 2 + 100, ky + 260, 280).color(concrete));
  sd.part('inlet', blk(-iw / 2, ky - 4, H + 20, iw / 2, ky + 1, H + 110).color(pit));
}

return sd.model();
