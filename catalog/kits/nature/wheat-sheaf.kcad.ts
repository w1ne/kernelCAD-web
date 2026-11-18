// Original kernelCAD low-poly wheat sheaf: a harvest bundle of straw that
// flares at the foot and the head, tied at the waist with a band, crowned by
// a fan of grain ears.

meta({
  name: 'wheat-sheaf',
  license: 'CC0-1.0',
  title: 'Wheat sheaf',
  description: 'Harvest wheat sheaf: a bundle of straw flared at the foot and head, tied with a band and crowned with grain ears, for farm and autumn scenes. Knobs: height, ears, straw, ear and band colours.',
  tags: ['wheat', 'sheaf', 'harvest', 'straw', 'grain', 'farm', 'autumn', 'field', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'farm', 'meadow', 'medieval'],
  triangleBudget: 450,
});

const heightM = param('heightM', '1.2', { choices: ['0.8', '1.2', '1.6'], label: 'Height (m)' });
const ears = param('ears', '11', { choices: ['7', '11', '15'], label: 'Grain ears' });
const straw = param('straw', '#d8b45a', { label: 'Straw' });
const ear = param('ear', '#c8963a', { label: 'Grain ears' });
const band = param('band', '#8a6a3a', { label: 'Tie band' });

presets({
  green: { straw: '#a8b45a', ear: '#8aa040' },
  pale: { straw: '#e8d49a', ear: '#d8b870' },
});

const h = Number(heightM.value) * 1000;
const n = Number(ears.value);
const s = 9;

const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) {
    const a = rot + (2 * Math.PI * k) / k0;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const sheaf = assembly('wheat-sheaf');
const waist = h * 0.42;
const rw = h * 0.07;
// Hourglass bundle: wide splayed foot, pinched waist, flaring head.
const rings = [[h * 0.2, 0], [h * 0.13, h * 0.12], [rw, waist], [h * 0.12, h * 0.68], [h * 0.15, h * 0.76]];
const profiles = rings.map(([r], i) => ngon(r, s, (i * Math.PI) / s));
sheaf.part('straw', profiles[0].loft(profiles.slice(1), {
  planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
  ruled: true,
}).color(straw));
sheaf.part('band', ngon(rw * 1.18, s).extrude(h * 0.06).translate(0, 0, waist - h * 0.03).color(band));

// Ears: slim faceted spindles fanning out of the head, the centre ones upright.
const el = h * 0.2;
const er = h * 0.022;
for (let i = 0; i < n; i++) {
  const ring = i === 0 ? 0 : i < 6 ? 1 : 2;
  const az = i * 137.5;
  const tilt = ring * 18 + 6 * (i % 2);
  const d = ring * h * 0.05;
  const spindle = ngon(er * 0.5, 4).loft([ngon(er, 4, Math.PI / 4), ngon(er * 0.2, 4)], {
    planes: [
      { plane: 'XY', origin: [0, 0, -el * 0.25] },
      { plane: 'XY', origin: [0, 0, el * 0.4] },
      { plane: 'XY', origin: [0, 0, el] },
    ],
    ruled: true,
  });
  sheaf.part(`ear-${i + 1}`, spindle.rotateY(tilt).translate(d, 0, h * 0.76).rotateZ(az).color(ear));
}

return sheaf.model();
