// Original kernelCAD low-poly front-loading washing machine: a white cabinet
// with a control strip, dial, display, detergent drawer and a round porthole
// door with a tinted glass window. Millimetres, Z up, standing on z = 0
// centred on x = y = 0. Front faces -Y.

meta({
  name: 'washing-machine',
  license: 'CC0-1.0',
  title: 'Washing machine',
  description: 'Front-loading washing machine or tumble dryer with a porthole door, programme dial, display and detergent drawer. Knobs: type, body, door ring, glass and control colours.',
  tags: ['washing machine', 'washer', 'dryer', 'tumble dryer', 'laundry', 'appliance', 'utility room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bathroom', 'kitchen', 'laundry'],
  triangleBudget: 300,
});

const kind = param('kind', 'washer', { choices: ['washer', 'dryer'], label: 'Type' });
const body = param('body', '#f2f2ef', { label: 'Body' });
const ring = param('ring', '#9aa0a6', { label: 'Door ring and dial' });
const glass = param('glass', '#3f5866', { label: 'Door glass' });
const panel = param('panel', '#2b2d30', { label: 'Display' });

presets({
  graphite: { body: '#4a4d52', ring: '#c9ccd0', glass: '#22282c' },
  silver: { body: '#c9ccd0', ring: '#5c6066' },
});

const W = 600;
const D = 600;
const H = 850;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
// A disc or ring facing -Y, standing proud of the front by `t` mm.
const disc = (r: number, t: number, n = 12) => ngon(r, n).extrude(t).rotateX(90);

const m = assembly('washing-machine');
m.part('cabinet', blk(-W / 2, -D / 2, 20, W / 2, D / 2, H).color(body));
m.part('feet', blk(-W / 2 + 30, -D / 2 + 30, 0, W / 2 - 30, D / 2 - 30, 21).color(ring));
const fy = -D / 2;
const dz = 400;
const dr = 210;
m.part('door-ring', disc(dr, 45).subtract(disc(dr - 50, 80).translate(0, 20, 0)).translate(0, fy + 1, dz).color(ring));
m.part('door-glass', disc(dr - 49, kind.value === 'washer' ? 55 : 35).translate(0, fy + 1, dz).color(kind.value === 'washer' ? glass : body));
m.part('handle', blk(dr - 30, fy - 70, dz - 50, dr + 5, fy - 30, dz + 50).color(ring));
// Control strip.
m.part('control-strip', blk(-W / 2 + 20, fy - 6, H - 140, W / 2 - 20, fy + 1, H - 20).color(body));
m.part('drawer', blk(-W / 2 + 30, fy - 16, H - 125, -W / 2 + 230, fy - 5, H - 35).color(body));
m.part('drawer-pull', blk(-W / 2 + 70, fy - 26, H - 60, -W / 2 + 190, fy - 15, H - 45).color(ring));
m.part('display', blk(-20, fy - 12, H - 110, 140, fy - 5, H - 55).color(panel));
m.part('dial', disc(45, 30, 10).translate(W / 2 - 100, fy - 5, H - 80).color(ring));
m.part('kick', blk(-W / 2 + 20, fy - 4, 40, W / 2 - 20, fy + 1, 110).color(ring));

return m.model();
