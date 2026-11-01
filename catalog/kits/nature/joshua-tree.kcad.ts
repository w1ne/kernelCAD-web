// Original kernelCAD low-poly Joshua tree: a shaggy trunk splitting into
// crooked arms that fork again, each tip crowned by a spiky star-section tuft.

meta({
  name: 'joshua-tree',
  license: 'CC0-1.0',
  title: 'Joshua tree',
  description: 'Mojave Joshua tree with a shaggy trunk, crooked forking arms and spiky leaf tufts at every tip, for desert scenes. Knobs: height, arms, bark and spike colours.',
  tags: ['joshua tree', 'yucca', 'desert', 'mojave', 'western', 'succulent', 'tree', 'nature'],
  kit: 'nature',
  category: 'nature',
  origin: 'base',
  compat: ['outdoor', 'desert', 'prairie'],
  triangleBudget: 560,
});

const heightM = param('heightM', '5', { choices: ['3', '5', '8'], label: 'Height (m)' });
const arms = param('arms', '3', { choices: ['2', '3', '4'], label: 'Arms' });
const bark = param('bark', '#7a6a52', { label: 'Bark' });
const spikes = param('spikes', '#6a8a3e', { label: 'Spiky leaves' });

presets({
  dry: { spikes: '#9a9a4e', bark: '#8a7a62' },
  dusk: { bark: '#5a4a3e', spikes: '#4f6a3a' },
});

const h = Number(heightM.value) * 1000;
const n = Number(arms.value);

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const star = (r: number, k: number) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < 2 * k; i++) {
    const a = (Math.PI * i) / k;
    const rr = i % 2 === 0 ? r : r * 0.3;
    p = p.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  return p.close();
};

const tree = assembly('joshua-tree');
const trunkH = h * 0.42;
tree.part('trunk', ngon(h * 0.045, 6).loft(ngon(h * 0.035, 6, 0.5), { spacing: trunkH + h * 0.03, ruled: true }).color(bark));

// Segment from a point along a direction (tilt from vertical, azimuth);
// returns the tip so the next segment or tuft can start there.
const seg = (name: string, from: [number, number, number], r: number, len: number, tilt: number, az: number) => {
  const piece = ngon(r, 5).loft(ngon(r * 0.8, 5), { spacing: len + r, ruled: true }).rotateY(tilt).rotateZ(az).translate(from[0], from[1], from[2]);
  tree.part(name, piece.color(bark));
  const t = (tilt * Math.PI) / 180;
  const a = (az * Math.PI) / 180;
  return [from[0] + len * Math.sin(t) * Math.cos(a), from[1] + len * Math.sin(t) * Math.sin(a), from[2] + len * Math.cos(t)] as [number, number, number];
};
// Spiky tuft: a star-section ball, wide spikes in the middle.
const tuft = (name: string, at: [number, number, number], r: number) => {
  const ball = star(r * 0.5, 5).loft([star(r, 5), star(r * 0.15, 5)], {
    planes: [
      { plane: 'XY', origin: [at[0], at[1], at[2] - r * 0.4] },
      { plane: 'XY', origin: [at[0], at[1], at[2] + r * 0.2] },
      { plane: 'XY', origin: [at[0], at[1], at[2] + r * 0.9] },
    ],
    ruled: true,
  });
  tree.part(name, ball.color(spikes));
};

const tr = h * 0.075;
for (let i = 0; i < n; i++) {
  const az = (360 * i) / n + 30;
  const tip = seg(`arm-${i + 1}`, [0, 0, trunkH], h * 0.028, h * 0.22, 40 + 8 * (i % 2), az);
  // Crooked elbow: bend back toward vertical, then fork into two twigs.
  const elbow = seg(`arm-${i + 1}-up`, tip, h * 0.022, h * 0.14, 12, az + 20);
  if (i % 2 === 0) {
    const a = seg(`twig-${i + 1}-a`, elbow, h * 0.016, h * 0.11, 38, az - 40);
    const b = seg(`twig-${i + 1}-b`, elbow, h * 0.016, h * 0.1, 30, az + 70);
    tuft(`tuft-${i + 1}-a`, a, tr);
    tuft(`tuft-${i + 1}-b`, b, tr * 0.9);
  } else {
    tuft(`tuft-${i + 1}`, elbow, tr);
  }
}

return tree.model();
