// Original kernelCAD low-poly bean bag chair: a slumped faceted sack with a
// raised back and a sunken seat hollow, built from offset polygon rings.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. The seat
// faces -Y.

meta({
  name: 'bean-bag',
  license: 'CC0-1.0',
  title: 'Bean bag',
  description: 'Slouchy bean bag chair with a raised back and a seat dip, with an optional seam band. Knobs: size, seam, fabric and seam colours.',
  tags: ['bean bag', 'beanbag', 'pouf', 'floor seat', 'lounge', 'kids room', 'gaming'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'kids-room', 'dorm'],
  triangleBudget: 300,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const seam = param('seam', 'yes', { choices: ['yes', 'no'], label: 'Seam band' });
const fabric = param('fabric', '#d0583a', { label: 'Fabric' });
const band = param('band', '#2b2d30', { label: 'Seam' });

presets({
  grey: { fabric: '#7d8288', band: '#efeee9' },
  teal: { fabric: '#2f7a7a', band: '#e3c27a' },
  denim: { fabric: '#3c5a78', band: '#c9b89a' },
});

const s = size.value === 'small' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const sides = 12;
// Ring with a soft bulge toward the back (+Y) so the sack slumps forward.
const ring = (r: number, back: number, rot: number) => {
  const pt = (k: number) => {
    const a = rot + (2 * Math.PI * k) / sides;
    const sy = Math.sin(a);
    const rr = r * (1 + back * Math.max(0, sy));
    return [rr * Math.cos(a), rr * sy] as const;
  };
  let p = path().moveTo(pt(0)[0], pt(0)[1]);
  for (let k = 1; k < sides; k++) p = p.lineTo(pt(k)[0], pt(k)[1]);
  return p.close();
};

const b = assembly('bean-bag');
const R = 450 * s;
const H = 820 * s;
// One sack loft whose upper rings shift back to form the backrest, with a
// conical seat hollow cut into the front of the top.
b.part('sack', ring(R * 0.85, 0, 0).loft([
  ring(R, 0.05, Math.PI / sides),
  ring(R * 0.9, 0.1, 0),
  ring(R * 0.6, 0.15, Math.PI / sides),
  ring(R * 0.28, 0.1, 0),
], {
  planes: [
    { plane: 'XY', origin: [0, 0, 0] },
    { plane: 'XY', origin: [0, 0, H * 0.25] },
    { plane: 'XY', origin: [0, R * 0.08, H * 0.55] },
    { plane: 'XY', origin: [0, R * 0.3, H * 0.85] },
    { plane: 'XY', origin: [0, R * 0.42, H] },
  ],
  ruled: true,
}).subtract(ring(R * 0.4, 0, 0).loft(ring(R * 0.85, 0, Math.PI / sides), {
  planes: [
    { plane: 'XY', origin: [0, -R * 0.12, H * 0.42] },
    { plane: 'XY', origin: [0, -R * 0.45, H * 1.05] },
  ],
  ruled: true,
})).color(fabric));
if (seam.value === 'yes') {
  b.part('seam', ring(R * 1.005, 0.05, Math.PI / sides).loft(ring(R * 0.985, 0.06, Math.PI / sides), {
    planes: [
      { plane: 'XY', origin: [0, 0, H * 0.2] },
      { plane: 'XY', origin: [0, 0, H * 0.25] },
    ],
    ruled: true,
  }).color(band));
}

return b.model();
