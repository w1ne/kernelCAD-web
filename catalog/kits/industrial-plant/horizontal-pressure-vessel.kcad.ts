meta({
  name: 'horizontal-pressure-vessel',
  license: 'CC0-1.0',
  title: 'Horizontal pressure vessel',
  description: 'Horizontal compressed-air receiver with saddle supports, end heads, top access hatch and gauge. Knobs: size, vessel, steel and safety colours.',
  tags: ['pressure vessel', 'air receiver', 'tank', 'factory', 'industrial', 'process plant'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial', 'factory'],
  triangleBudget: 600,
});

const scale = param('size', '1', { choices: ['0.8', '1', '1.25'], label: 'Size scale' });
const body = param('body', '#607478', { label: 'Main body' });
const steel = param('steel', '#3f484b', { label: 'Steelwork' });
const accent = param('accent', '#dda91f', { label: 'Safety accent' });

presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('horizontal-pressure-vessel');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 2400 * S, R = 420 * S, zc = R + 100 * S;
a.part('shell', ngon(R, 8).extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(body));
a.part('left-head', ngon(R * 0.94, 8).extrude(38 * S).rotateY(90).translate(-L / 2 - 38 * S, 0, zc).color(steel));
a.part('right-head', ngon(R * 0.94, 8).extrude(38 * S).rotateY(90).translate(L / 2, 0, zc).color(steel));
for (let i = 0; i < 2; i++) {
  const x = (i === 0 ? -1 : 1) * L * 0.28;
  block(`saddle-foot-${i}`, 280 * S, 720 * S, 45 * S, x, 0, 0, steel);
  block(`saddle-${i}`, 260 * S, 700 * S, 78 * S, x, 0, 45 * S, steel);
  block(`saddle-cap-${i}`, 300 * S, 740 * S, 55 * S, x, 0, 100 * S, accent);
}
a.part('hatch-neck', ngon(95 * S, 8).extrude(120 * S).translate(0, 0, zc + R - 5 * S).color(steel));
a.part('hatch-lid', ngon(125 * S, 8).extrude(24 * S).translate(0, 0, zc + R + 115 * S).color(accent));
a.part('gauge', ngon(42 * S, 8).extrude(24 * S).rotateX(90).translate(250 * S, -R * 0.82, zc + 190 * S).color(accent));

return a.model();
