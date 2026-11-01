// Original kernelCAD low-poly tiki torch: a jointed bamboo pole pushed into a
// small earth mound, a flared woven fuel basket with lashing bands, a wick
// tube and a layered flame. Millimetres, Z up, base on z = 0 centred on
// x = y = 0.

meta({
  name: 'tiki-torch',
  license: 'CC0-1.0',
  title: 'Tiki torch',
  description: 'Bamboo tiki torch stuck in an earth mound with a woven fuel basket, wick and burning flame, for beach bars, luaus and tropical gardens. Knobs: height, lit, bamboo, basket, mound and flame colours.',
  tags: ['tiki torch', 'torch', 'bamboo', 'tropical', 'beach', 'luau', 'garden torch', 'fire'],
  kit: 'lighting',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'beach', 'tropical', 'garden', 'camp', 'island'],
  triangleBudget: 400,
});

const height = param('height', 'standard', { choices: ['short', 'standard', 'tall'], label: 'Height' });
const lit = param('lit', 'on', { choices: ['on', 'off'], label: 'Lit' });
const bamboo = param('bamboo', '#c9a85a', { label: 'Bamboo' });
const basket = param('basket', '#8a6a3a', { label: 'Woven basket' });
const ground = param('ground', '#6a5236', { label: 'Earth mound' });
const flame = param('flame', '#f07a1e', { label: 'Flame' });
const core = param('core', '#ffd84a', { label: 'Flame core and wick' });

presets({
  dark: { bamboo: '#6a4a2a', basket: '#3a2a1a' },
  sand: { ground: '#d8c08a' },
  spirit: { flame: '#3a8af0', core: '#bfefff' },
});

const H = height.value === 'short' ? 900 : height.value === 'tall' ? 1800 : 1400;
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

const t = assembly('tiki-torch');
t.part('mound', rings([[150, 0], [95, 40], [30, 60]], 7, 0.3).color(ground));
// Bamboo pole with a raised node every ~300 mm.
t.part('pole', ngon(24, 6).extrude(H).translate(0, 0, 20).color(bamboo));
const nodes = Math.floor((H - 200) / 320);
for (let i = 1; i <= nodes; i++) t.part(`node-${i}`, ngon(30, 6).extrude(18).translate(0, 0, 60 + (i * (H - 200)) / (nodes + 0.5)).color(bamboo));
// Woven basket: flared cone with two lashing bands, slightly skewed facets.
const zb = H - 30;
t.part('basket', rings([[30, zb], [78, zb + 170], [84, zb + 225], [74, zb + 240]], 7, 0.2).color(basket));
t.part('band-low', rings([[50, zb + 60], [58, zb + 82]], 7, 0.65).color(bamboo));
t.part('band-high', rings([[82, zb + 180], [86, zb + 204]], 7, 0.65).color(bamboo));
// Wick tube and flame.
t.part('wick', ngon(20, 6).extrude(55).translate(0, 0, zb + 230).color(lit.value === 'on' ? core : basket));
if (lit.value === 'on') {
  const tongue = (r: number, h: number, x: number, y: number, rot: number) =>
    ngon(r, 5, rot).loft([ngon(r * 1.25, 5, rot + 0.4), ngon(r * 0.1, 5, rot + 0.8)], {
      planes: [
        { plane: 'XY', origin: [x, y, zb + 265] },
        { plane: 'XY', origin: [x * 1.2, y * 1.2, zb + 265 + h * 0.35] },
        { plane: 'XY', origin: [x * 0.5, y * 0.5, zb + 265 + h] },
      ],
      ruled: true,
    });
  for (let i = 0; i < 3; i++) {
    const a = (2 * Math.PI * i) / 3 + 0.4;
    t.part(`flame-${i + 1}`, tongue(36, 230 - 40 * i, 30 * Math.cos(a), 30 * Math.sin(a), i).color(flame));
  }
  t.part('flame-core', tongue(38, 340, 0, 0, 0.3).color(core));
}

return t.model();
