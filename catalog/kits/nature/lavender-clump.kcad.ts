// Original kernelCAD low-poly lavender: a silvery leafy mound with thin stems
// fanning out of it, each topped by a slim faceted flower spike.

meta({
  name: 'lavender-clump',
  license: 'CC0-1.0',
  title: 'Lavender clump',
  description: 'Rounded lavender bush with a silver-green leafy mound and a fan of slim flower spikes. Knobs: size, spike count, flower, leaf and stem colours.',
  tags: ['lavender', 'herb', 'flower', 'shrub', 'garden', 'provence', 'purple', 'plant', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'garden', 'meadow', 'park'],
  triangleBudget: 500,
});

const size = param('size', '0.6', { choices: ['0.4', '0.6', '0.9'], label: 'Width (m)' });
const count = param('count', '13', { choices: ['9', '13', '15'], label: 'Flower spikes' });
const flowers = param('flowers', '#8a6cc8', { label: 'Flowers' });
const leaves = param('leaves', '#8fa38a', { label: 'Leaves' });
const stems = param('stems', '#6f8a5a', { label: 'Stems' });

presets({
  white: { flowers: '#ece8f2' },
  pink: { flowers: '#d47fb0' },
  deep: { flowers: '#5d3f9e' },
});

const w = Number(size.value) * 1000;
const n = Number(count.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const plant = assembly('lavender-clump');
const R = w / 2;
const moundH = w * 0.45;
plant.part('mound', ngon(R * 0.75, 7).loft([ngon(R, 7, Math.PI / 7), ngon(R * 0.75, 7), ngon(R * 0.25, 7, Math.PI / 7)], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, moundH * 0.4] },
    { plane: 'XY', origin: [0, 0, moundH * 0.8] },
    { plane: 'XY', origin: [0, 0, moundH] },
  ],
  ruled: true,
}).color(leaves));

// Stems start inside the mound and fan outward; inner ones stand taller.
const stemR = Math.max(5, w * 0.008);
const spikeR = w * 0.03;
for (let i = 0; i < n; i++) {
  const ring = i === 0 ? 0 : i <= 5 ? 1 : 2;
  const a = (i * 137.5) % 360;
  const tilt = ring * 14 + (i % 3) * 4;
  const len = w * (1.05 - ring * 0.12) * (0.95 + 0.08 * Math.sin(i * 1.9));
  const z0 = moundH * 0.5;
  const spikeL = w * 0.28;
  plant.part(`stem-${i + 1}`, ngon(stemR, 3).extrude(len).rotateY(tilt).rotateZ(a).translate(0, 0, z0).color(stems));
  const spike = ngon(spikeR * 0.7, 4).loft([ngon(spikeR, 4, Math.PI / 4), ngon(spikeR * 0.15, 4)], {
    planes: [
      { plane: 'XY', origin: [0, 0, len - 10] },
      { plane: 'XY', origin: [0, 0, len + spikeL * 0.35] },
      { plane: 'XY', origin: [0, 0, len + spikeL] },
    ],
    ruled: true,
  });
  plant.part(`spike-${i + 1}`, spike.rotateY(tilt).rotateZ(a).translate(0, 0, z0).color(flowers));
}

return plant.model();
