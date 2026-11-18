// Original kernelCAD low-poly candelabra: a stepped round foot, a knopped
// stem and curved-looking arms (angled segments) each ending in a drip cup
// with a candle and a flame; one arm gives a simple candlestick.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, arms along X.

meta({
  name: 'candelabra',
  license: 'CC0-1.0',
  title: 'Candelabra',
  description: 'Brass candelabra or single candlestick with drip cups, wax candles and lit flames, for tables, altars and haunted halls. Knobs: candles, height, metal, wax and flame colours.',
  tags: ['candelabra', 'candlestick', 'candle holder', 'candles', 'candle', 'light', 'medieval', 'gothic', 'fantasy', 'church', 'table decor'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'medieval', 'fantasy', 'gothic', 'dungeon', 'church', 'dining-room'],
  triangleBudget: 480,
});

const candles = param('candles', '3', { choices: ['1', '3', '5'], label: 'Candles' });
const height = param('height', 'table', { choices: ['table', 'floor'], label: 'Height' });
const metal = param('metal', '#c9a43a', { label: 'Metal' });
const wax = param('wax', '#f2ecd8', { label: 'Wax' });
const flame = param('flame', '#ffb43a', { label: 'Flame' });

presets({
  silver: { metal: '#c4c8cc' },
  iron: { metal: '#3a3a3e', wax: '#e8dcb8' },
  black: { metal: '#2a2a2c', wax: '#2a2a2c', flame: '#8a4af0' },
});

const n = Number(candles.value);
const s = height.value === 'floor' ? 3.2 : 1;
const ngon = (r: number, k0 = 8) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / k0), r * Math.sin((2 * Math.PI * k) / k0));
  return p.close();
};
const seg = (x0: number, z0: number, x1: number, z1: number, t: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len + t, t, t, true).rotateY(-a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
};

const stemTop = 230 * s;
const c = assembly('candelabra');
// Metal pieces are separate overlapping parts: unions of thin arms cost
// far more triangles than the pieces themselves.
const metalParts: Shape[] = [
  ngon(75 * (s > 1 ? 1.8 : 1)).loft(ngon(40 * (s > 1 ? 1.4 : 1)), { spacing: 30 * (s > 1 ? 1.6 : 1), ruled: true }),
  ngon(14, 6).extrude(stemTop - 20).translate(0, 0, 25),
  ngon(24, 6).loft(ngon(14, 6), { spacing: 30, ruled: true }).translate(0, 0, stemTop * 0.45),
];
// Arms: from the stem out and up to each cup, in the XZ plane.
const cups: [number, number][] = [[0, stemTop]];
if (n >= 3) {
  for (const sx of [-1, 1]) {
    const x = sx * 110;
    metalParts.push(seg(0, stemTop - 70, sx * 70, stemTop - 80, 12), seg(sx * 70, stemTop - 80, x, stemTop - 25, 12));
    cups.push([x, stemTop - 25]);
  }
}
if (n === 5) {
  for (const sx of [-1, 1]) {
    const x = sx * 200;
    metalParts.push(seg(sx * 70, stemTop - 80, sx * 160, stemTop - 115, 12), seg(sx * 160, stemTop - 115, x, stemTop - 60, 12));
    cups.push([x, stemTop - 60]);
  }
}
for (const [x, z] of cups) metalParts.push(ngon(32).loft(ngon(14), { spacing: 18, ruled: true }).rotateX(180).translate(x, 0, z + 18));
metalParts.forEach((sh, i) => c.part(`stand-${i + 1}`, sh.color(metal)));
cups.forEach(([x, z], i) => {
  const ch = (i === 0 ? 150 : 120) * (s > 1 ? 1.4 : 1);
  c.part(`candle-${i + 1}`, ngon(16, 6).extrude(ch).translate(x, 0, z + 16).color(wax));
  c.part(`flame-${i + 1}`, ngon(9, 4).loft(ngon(1.5, 4), { spacing: 40, ruled: true }).translate(x, 0, z + 16 + ch - 2).color(flame));
});

return c.model();
