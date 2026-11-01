// Original kernelCAD low-poly watering can: a faceted drum body, a long
// tapering spout with a rose head and a looped top handle.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, spout towards +X.

meta({
  name: 'watering-can',
  license: 'CC0-1.0',
  title: 'Watering can',
  description: 'Garden watering can with a drum body, long angled spout with rose head, and arched carry handle. Knobs: can, spout rose and handle colours.',
  tags: ['watering can', 'garden', 'gardening', 'water', 'plants', 'tool', 'farm'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'garden', 'farm', 'greenhouse'],
  triangleBudget: 240,
});

const can = param('can', '#3f8a5a', { label: 'Can' });
const rose = param('rose', '#c9a43a', { label: 'Spout rose' });
const grip = param('grip', '#2f6a44', { label: 'Handle' });

presets({
  galvanised: { can: '#a8b0b4', rose: '#8a9296', grip: '#8a9296' },
  red: { can: '#c8302a', rose: '#e8c33a', grip: '#9a241f' },
});

const n = 10;
const R = 120;
const H = 260;
const ngon = (r: number, k0 = n) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / k0), r * Math.sin((2 * Math.PI * k) / k0));
  return p.close();
};

const w = assembly('watering-can');
w.part('can', ngon(R).extrude(H).translate(-60, 0, 0)
  .union(ngon(R * 0.98).loft(ngon(R * 0.55), { spacing: 40, ruled: true }).translate(-60, 0, H - 1))
  // Spout: a thin tapering hexagonal tube rising forward at 40 degrees.
  .union(ngon(24, 6).loft(ngon(13, 6), { spacing: 360, ruled: true }).rotateY(50).translate(-60 + R * 0.7, 0, 50))
  .color(can));
const tipX = -60 + R * 0.7 + 360 * Math.sin((50 * Math.PI) / 180);
const tipZ = 50 + 360 * Math.cos((50 * Math.PI) / 180);
w.part('rose', ngon(18, 6).loft(ngon(42, 8), { spacing: 45, ruled: true }).rotateY(50).translate(tipX - 12, 0, tipZ - 10).color(rose));
// Handle: a back loop and a top bar.
w.part('handle', box(28, 26, 150, true).translate(-60 - R + 10, 0, H - 20)
  .union(box(R * 1.6, 26, 26, true).translate(-60 - R * 0.25, 0, H + 70))
  .union(box(26, 26, 90, true).translate(-60 + R * 0.4, 0, H + 30))
  .union(box(80, 26, 26, true).translate(-60 - R + 30, 0, H + 55).rotateY(0))
  .color(grip));

return w.model();
