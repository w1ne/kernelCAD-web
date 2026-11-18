// Original kernelCAD low-poly lily pads: floating round leaves with a notch
// cut to the centre, plus an optional water lily flower of two petal crowns.
// Sits on the water surface at z = 0, centred on x = y = 0.

meta({
  name: 'lily-pads',
  license: 'CC0-1.0',
  title: 'Lily pads',
  description: 'Cluster of floating notched lily pads with an optional open water lily flower, laid on a water surface. Knobs: pad count, flower, pad, petal and centre colours.',
  tags: ['lily pad', 'water lily', 'lotus', 'pond', 'lake', 'swamp', 'water plant', 'flower', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'water', 'swamp', 'water-tile'],
  triangleBudget: 450,
});

const pads = param('pads', '5', { choices: ['3', '5', '7'], label: 'Pads' });
const bloom = param('bloom', 'yes', { choices: ['yes', 'no'], label: 'Flower' });
const leaf = param('leaf', '#4f8f3a', { label: 'Pads' });
const petals = param('petals', '#f4d2df', { label: 'Petals' });
const centre = param('centre', '#f2c42a', { label: 'Flower centre' });

presets({
  white: { petals: '#f6f4ee' },
  lotus: { petals: '#e27aa6' },
  autumn: { leaf: '#8f8a3a' },
});

const n = Number(pads.value);

// Pad: a 10-sided disc with a wedge notch to the centre, thin slab.
const pad = (r: number, rot: number) => {
  const pts: [number, number][] = [[r * 0.08, 0]];
  const s = 9;
  for (let k = 0; k <= s; k++) {
    const a = 0.32 + ((2 * Math.PI - 0.64) * k) / s;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return extrudePolygon(pts, 18).rotateZ(rot);
};
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// Petal crown: a star loft opening upward from a small base.
const crown = (r: number, z: number, hh: number, rot: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < 16; k++) {
    const a = rot + (Math.PI * k) / 8;
    const rr = k % 2 === 0 ? r : r * 0.45;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return ngon(r * 0.3, 8, rot).loft(p.close(), { spacing: hh, ruled: true }).translate(0, 0, z);
};

const lilies = assembly('lily-pads');
const spots: [number, number, number][] = [[0, 0, 300]];
for (let i = 1; i < n; i++) {
  const a = i * 2.39996;
  const d = 380 + 90 * (i % 3);
  spots.push([d * Math.cos(a), d * Math.sin(a), 170 + 60 * ((i * 7) % 3)]);
}
spots.forEach(([x, y, r], i) => {
  lilies.part(`pad-${i + 1}`, pad(r, i * 1.9).translate(x, y, 0).color(leaf));
});

if (bloom.value === 'yes') {
  const fx = spots[0][0] + 60;
  const fy = spots[0][1] - 40;
  lilies.part('petals-outer', crown(170, 10, 90, 0).translate(fx, fy, 0).color(petals));
  lilies.part('petals-inner', crown(110, 30, 110, Math.PI / 8).translate(fx, fy, 0).color(petals));
  lilies.part('centre', ngon(34, 6).extrude(120).translate(fx, fy, 15).color(centre));
}

return lilies.model();
