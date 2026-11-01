// Original kernelCAD low-poly EV charging post: a slim pedestal on a base
// plate with a dark screen, light strips, a side holster with a plugged-in
// connector and a cable that loops down beside the post. Millimetres, Z up,
// front faces -Y.

meta({
  name: 'ev-charger',
  license: 'CC0-1.0',
  title: 'EV charger',
  description: 'Electric vehicle charging post with screen, light strips, holstered connector and looping cable. Knobs: body, light and screen colours.',
  tags: ['ev charger', 'charging station', 'electric car', 'charger', 'parking', 'plug', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'parking'],
  triangleBudget: 320,
});

const body = param('body', '#eceeef', { label: 'Body' });
const light = param('light', '#2fbf5a', { label: 'Light strips' });
const screen = param('screen', '#1d2024', { label: 'Screen, cable and plug' });

presets({
  blue: { light: '#2a9fe8' },
  dark: { body: '#3a3f45', light: '#46e0ff' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Straight bar in the XZ plane at depth y, from (x0, z0) to (x1, z1), square section t.
const bar = (x0: number, z0: number, x1: number, z1: number, t: number, y = 0) => {
  const len = Math.hypot(x1 - x0, z1 - z0) + t;
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len, t, t, true).rotateY(-a).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
};

const ev = assembly('ev-charger');
ev.part('base', blk(-240, -180, 0, 240, 180, 40).color(screen));
ev.part('post', blk(-170, -110, 35, 170, 110, 1500).color(body));
ev.part('cap', blk(-185, -125, 1500, 185, 125, 1540).color(light));
ev.part('screen', blk(-120, -118, 1150, 120, -109, 1360).color(screen));
for (const side of [-1, 1]) {
  ev.part(`strip-${side < 0 ? 'l' : 'r'}`, blk(side * 170 - 12, -118, 200, side * 170 + 12, -100, 1450).color(light));
}
ev.part('holster', blk(165, -70, 950, 260, 70, 1100).color(screen));
ev.part('plug', blk(240, -40, 1060, 300, 40, 1180).color(screen));
// Cable loop from the low side of the post round to the plug.
const pts: [number, number][] = [[160, 700], [300, 520], [440, 470], [520, 620], [470, 900], [300, 1130]];
for (let i = 0; i < pts.length - 1; i++) {
  const [x0, z0] = pts[i]!;
  const [x1, z1] = pts[i + 1]!;
  ev.part(`cable-${i + 1}`, bar(x0, z0, x1, z1, 36, 0).color(screen));
}

return ev.model();
