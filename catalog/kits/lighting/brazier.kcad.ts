// Original kernelCAD low-poly brazier: a flared octagonal iron fire bowl with
// a rolled rim, heaped glowing coals and layered flames, on splayed legs with
// a brace ring or on a stepped pedestal. Millimetres, Z up, base on z = 0
// centred on x = y = 0.

meta({
  name: 'brazier',
  license: 'CC0-1.0',
  title: 'Brazier',
  description: 'Iron brazier fire bowl full of glowing coals and flames on splayed legs or a pedestal, burning, smouldering or cold, for temples, castle gates and dungeon halls. Knobs: stand, legs, fire, iron, coal, flame and core colours.',
  tags: ['brazier', 'fire bowl', 'fire pit', 'fire', 'flames', 'coals', 'temple', 'medieval', 'dungeon'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'medieval', 'dungeon', 'castle', 'temple', 'fantasy', 'camp'],
  triangleBudget: 560,
});

const stand = param('stand', 'legs', { choices: ['legs', 'pedestal'], label: 'Stand' });
const legs = param('legs', '3', { choices: ['3', '4'], label: 'Legs' });
const fire = param('fire', 'burning', { choices: ['burning', 'smouldering', 'cold'], label: 'Fire' });
const iron = param('iron', '#3a3a3e', { label: 'Iron' });
const coal = param('coal', '#d8481e', { label: 'Coals' });
const flame = param('flame', '#f08a1e', { label: 'Flame' });
const core = param('core', '#ffd84a', { label: 'Flame core' });

presets({
  bronze: { iron: '#8a5a2a' },
  'holy-fire': { flame: '#f0e0a0', core: '#ffffff', iron: '#c9a43a' },
  hellfire: { flame: '#c01e1e', core: '#ff7a2a', coal: '#5a1010', iron: '#1e1a1a' },
});

const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / n), r * Math.sin(rot + (2 * Math.PI * k) / n));
  return p.close();
};
const rings = (rs: [number, number][], n: number, rot = 0) =>
  ngon(rs[0][0], n, rot).loft(rs.slice(1).map(([r]) => ngon(r, n, rot)), {
    planes: rs.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
const seg = (x0: number, z0: number, x1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len + t, t, t, true).rotateY(-a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
};

const b = assembly('brazier');
const N = 8;
const zb = 560; // bowl bottom
b.part('bowl', rings([[90, zb], [200, zb + 70], [270, zb + 190], [295, zb + 200], [295, zb + 222], [262, zb + 222]], N, Math.PI / 8).color(iron));
if (stand.value === 'legs') {
  const nl = Number(legs.value);
  for (let i = 0; i < nl; i++) {
    const a = (360 * i) / nl + 90;
    // Splayed leg: foot pad, a kinked bar up to the bowl's side, a scroll tip.
    const pts: [number, number][] = [[290, 28], [210, 300], [190, zb + 60], [240, zb + 130]];
    for (let k = 0; k < pts.length - 1; k++) b.part(`leg-${i + 1}-${k + 1}`, seg(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 26).rotateZ(a).color(iron));
    b.part(`foot-${i + 1}`, box(80, 50, 20).translate(270, -25, 0).rotateZ(a).color(iron));
  }
  b.part('brace', ngon(232, N, Math.PI / 8).extrude(20).subtract(ngon(212, N, Math.PI / 8).extrude(30).translate(0, 0, -5)).translate(0, 0, 280).color(iron));
} else {
  b.part('pedestal', rings([[220, 0], [220, 40], [150, 70], [80, 110], [60, 300], [70, zb - 40], [120, zb + 10]], N, Math.PI / 8).color(iron));
}
if (fire.value !== 'cold') {
  b.part('coals', rings([[264, zb + 200], [210, zb + 240], [90, zb + 265]], 7, 0.3).color(coal));
}
if (fire.value === 'burning') {
  const base = zb + 220;
  const tongue = (r: number, h: number, x: number, y: number, rot: number) =>
    ngon(r, 5, rot).loft([ngon(r * 1.15, 5, rot + 0.4), ngon(r * 0.1, 5, rot + 0.8)], {
      planes: [
        { plane: 'XY', origin: [x, y, base] },
        { plane: 'XY', origin: [x * 0.85, y * 0.85, base + h * 0.3] },
        { plane: 'XY', origin: [x * 1.4, y * 1.4, base + h] },
      ],
      ruled: true,
    });
  for (let i = 0; i < 5; i++) {
    const a = (2 * Math.PI * i) / 5 + 0.3;
    b.part(`flame-${i + 1}`, tongue(80, 330 - 90 * (i % 2), 140 * Math.cos(a), 140 * Math.sin(a), i).color(flame));
  }
  b.part('flame-core', tongue(110, 480, 0, 0, 0.3).color(core));
}

return b.model();
