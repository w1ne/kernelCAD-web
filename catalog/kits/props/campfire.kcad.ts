// Original kernelCAD low-poly campfire: a ring of faceted stones around
// crossed logs with layered faceted flames, or cold embers.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'campfire',
  license: 'CC0-1.0',
  title: 'Campfire',
  description: 'Campfire of crossed logs inside a ring of stones with layered low-poly flames, burning or burnt out. Knobs: state, stone count, logs, stone, flame and ember colours.',
  tags: ['campfire', 'fire', 'bonfire', 'camp', 'flames', 'logs', 'stones', 'camping', 'survival'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'forest', 'camp', 'medieval', 'fantasy', 'survival'],
  triangleBudget: 440,
});

const state = param('state', 'burning', { choices: ['burning', 'embers'], label: 'State' });
const stones = param('stones', '8', { choices: ['6', '8', '10'], label: 'Stones' });
const wood = param('wood', '#6e4a2c', { label: 'Logs' });
const stone = param('stone', '#8a8d91', { label: 'Stones' });
const flame = param('flame', '#f08a1e', { label: 'Outer flame' });
const core = param('core', '#ffd84a', { label: 'Flame core and embers' });

presets({
  magic: { flame: '#4a7ef0', core: '#bfe8ff' },
  cursed: { flame: '#5ad04a', core: '#e0ff9a', stone: '#4a4a52' },
});

const ns = Number(stones.value);
const R = 420;
const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};

const f = assembly('campfire');
for (let i = 0; i < ns; i++) {
  const a = (2 * Math.PI * i) / ns;
  const sr = 85 + 15 * Math.sin(i * 2.7);
  f.part(`stone-${i + 1}`, ngon(sr, 5, i).loft(ngon(sr * 0.5, 5, i + 0.6), { spacing: sr * 0.9, ruled: true })
    .scale([1.25, 0.9, 1]).rotateZ((a * 180) / Math.PI).translate(R * Math.cos(a), R * Math.sin(a), 0).color(stone));
}
// Logs: two crossed pairs of hexagonal logs lying on the ground.
const logR = 50;
for (let i = 0; i < 4; i++) {
  const az = 45 * i + 10;
  const z = i < 2 ? logR : logR + 70;
  f.part(`log-${i + 1}`, ngon(logR, 6).extrude(640).translate(0, 0, -320).rotateY(90).rotateZ(az).translate(0, 0, z).color(wood));
}
if (state.value === 'burning') {
  // Flames: broad twisted tongues around a taller bright core.
  const tongue = (r: number, h: number, x: number, y: number, rot: number) =>
    ngon(r, 5, rot).loft([ngon(r * 0.75, 5, rot + 0.4), ngon(r * 0.12, 5, rot + 0.8)], {
      planes: [
        { plane: 'XY', origin: [x, y, 80] },
        { plane: 'XY', origin: [x * 0.85, y * 0.85, 80 + h * 0.4] },
        { plane: 'XY', origin: [x * 1.1, y * 1.1, 80 + h] },
      ],
      ruled: true,
    });
  for (let i = 0; i < 4; i++) {
    const a = (2 * Math.PI * i) / 4 + 0.6;
    f.part(`flame-${i + 1}`, tongue(105, 400 - 90 * (i % 2), 150 * Math.cos(a), 150 * Math.sin(a), i).color(flame));
  }
  f.part('flame-core', tongue(110, 620, 0, 0, 0.3).color(core));
} else {
  f.part('embers', ngon(200, 7).loft(ngon(110, 7, 0.4), { spacing: 60, ruled: true }).color(core));
}

return f.model();
