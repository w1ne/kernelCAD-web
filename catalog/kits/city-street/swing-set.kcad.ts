// Original kernelCAD low-poly swing set: a top beam on two splayed A-frames
// with cross braces, and one to three swings hanging on pairs of chains.
// Millimetres, Z up, beam along X, swings move along Y.

meta({
  name: 'swing-set',
  license: 'CC0-1.0',
  title: 'Swing set',
  description: 'Playground swing set with A-frame legs, top beam and one to three chain swings. Knobs: swings, frame, seat and chain colours.',
  tags: ['swing', 'swing set', 'swings', 'playground', 'play equipment', 'kids', 'park', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'park', 'playground', 'garden'],
  triangleBudget: 360,
});

const swings = param('swings', '2', { choices: ['1', '2', '3'], label: 'Swings' });
const frame = param('frame', '#2f7d4a', { label: 'Frame' });
const seat = param('seat', '#e8432e', { label: 'Seats' });
const chain = param('chain', '#9aa0a6', { label: 'Chains' });

presets({
  wooden: { frame: '#8a5c33', seat: '#2a2c2e' },
  blue: { frame: '#2a5ea8', seat: '#f2c418' },
});

const n = Number(swings.value);
const L = n * 1000 + 500;
const top = 2300;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Side-profile prism: points are (y, z), thickness t along X from x0.
const sideProfile = (pts: [number, number][], x0: number, t: number) =>
  extrudePolygon(pts, t).rotateX(90).rotateZ(90).translate(x0, 0, 0);

const ss = assembly('swing-set');
ss.part('beam', blk(-L / 2 - 100, -60, top - 60, L / 2 + 100, 60, top + 60).color(frame));
for (const [k, x] of [[1, -L / 2], [2, L / 2]] as const) {
  for (const side of [-1, 1]) {
    const leg: [number, number][] = side < 0
      ? [[-1000, 0], [-900, 0], [40, top + 40], [-60, top + 40]]
      : [[900, 0], [1000, 0], [60, top + 40], [-40, top + 40]];
    ss.part(`leg-${k}-${side < 0 ? 'front' : 'back'}`, sideProfile(leg, x - 45, 90).color(frame));
  }
  ss.part(`brace-${k}`, blk(x - 40, -640, 760, x + 40, 640, 830).color(frame));
}
for (let i = 0; i < n; i++) {
  const cx = -L / 2 + 750 + i * 1000;
  for (const dx of [-210, 210]) {
    ss.part(`chain-${i + 1}-${dx < 0 ? 'l' : 'r'}`, blk(cx + dx - 10, -10, 440, cx + dx + 10, 10, top - 50).color(chain));
  }
  ss.part(`seat-${i + 1}`, blk(cx - 260, -110, 400, cx + 260, 110, 450).color(seat));
}

return ss.model();
