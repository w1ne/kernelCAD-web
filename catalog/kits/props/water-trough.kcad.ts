// Original kernelCAD low-poly water trough: a long plank or stone tank with
// splayed sides (a ruled loft hollowed by a smaller loft), end braces and
// water, on short legs or a plinth. Millimetres, Z up, base on z = 0
// centred on x = y = 0, long side along X.

meta({
  name: 'water-trough',
  license: 'CC0-1.0',
  title: 'Water trough',
  description: 'Livestock water trough with splayed sides, in planked wood on legs or carved stone, filled with water. Knobs: style, length, body, band and water colours.',
  tags: ['trough', 'water trough', 'horse trough', 'farm', 'stable', 'livestock', 'water', 'medieval'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'farm', 'stable', 'medieval', 'village', 'western'],
  triangleBudget: 300,
});

const style = param('style', 'wood', { choices: ['wood', 'stone'], label: 'Style' });
const lengthMm = param('lengthMm', '1600', { choices: ['1000', '1600', '2200'], label: 'Length (mm)' });
const body = param('body', '#9a6a3c', { label: 'Body' });
const band = param('band', '#3f3d3b', { label: 'Bands and legs' });
const water = param('water', '#4f8fb8', { label: 'Water' });

presets({
  stone: { style: 'stone', body: '#9a958c', band: '#7f7a72' },
  murky: { water: '#5f7a4a' },
});

const L = Number(lengthMm.value);
const isWood = style.value === 'wood';
const z0 = isWood ? 220 : 0;
const H = isWood ? 380 : 550;
const Wb = isWood ? 360 : 600;
const Wt = isWood ? 560 : 700;
const t = isWood ? 40 : 110;

const rect = (l: number, w: number) => path().moveTo(-l / 2, -w / 2).lineTo(l / 2, -w / 2).lineTo(l / 2, w / 2).lineTo(-l / 2, w / 2).close();

const tr = assembly('water-trough');
tr.part('body', rect(L - (Wt - Wb) * 0.4, Wb).loft(rect(L, Wt), { spacing: H, ruled: true })
  .subtract(rect(L - 2 * t - (Wt - Wb) * 0.4, Wb - 2 * t).loft(rect(L - 2 * t, Wt - 2 * t), { spacing: H, ruled: true }).translate(0, 0, t))
  .translate(0, 0, z0).color(body));
tr.part('water', rect(L - 2 * t - 20, Wt - 2 * t - 30).extrude(15).translate(0, 0, z0 + H * 0.78).color(water));
if (isWood) {
  // Iron bands around the body near each end, and four splayed legs.
  for (const [i, x] of [[1, -L * 0.35], [2, L * 0.35]] as [number, number][]) {
    tr.part(`band-${i}`, rect(50, Wb + 20).loft(rect(50, Wt + 20), { spacing: H + 2, ruled: true }).translate(x, 0, z0 - 1).color(band));
    for (const sy of [-1, 1]) {
      // Lift each splayed leg so its lowest corner lands exactly on z = 0.
      const lh = z0 + 60;
      const lz = (lh / 2) * Math.cos((12 * Math.PI) / 180) + 35 * Math.sin((12 * Math.PI) / 180);
      tr.part(`leg-${i}-${sy < 0 ? 'a' : 'b'}`, box(70, 70, lh, true).rotateX(sy * -12).translate(x, sy * (Wb / 2 - 10), lz).color(band));
    }
  }
} else {
  // Stone: a slightly wider plinth course at the base.
  tr.part('plinth', rect(L + 60, Wb + 80).extrude(90).color(band));
}

return tr.model();
