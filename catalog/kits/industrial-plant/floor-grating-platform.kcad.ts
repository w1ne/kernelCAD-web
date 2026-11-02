meta({
  name: 'floor-grating-platform',
  license: 'CC0-1.0',
  title: 'Floor grating platform panel',
  description: 'Modular steel grating panel with perimeter frame, repeating cross bars and four locating tabs. Knobs: size, bar count, steel and safety colours.',
  tags: ['floor grating', 'walkway panel', 'industrial floor', 'factory', 'industrial'],
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
const a = assembly('floor-grating-platform');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 1800 * S, W = 900 * S;
block('perimeter', L, W, 65 * S, 0, 0, 0, steel);
for (let i = 1; i < 10; i++) block(`long-bar-${i}`, L * 0.96, 24 * S, 48 * S, 0, (i - 5) * W / 10, 55 * S, body);
for (let i = 1; i < 13; i++) block(`cross-bar-${i}`, 24 * S, W * 0.96, 38 * S, (i - 6.5) * L / 13, 0, 58 * S, i % 2 ? accent : steel);
for (let i = 0; i < 4; i++) block(`locating-tab-${i}`, 120 * S, 80 * S, 35 * S, (i < 2 ? -1 : 1) * L * 0.45, (i % 2 ? 1 : -1) * W * 0.42, 65 * S, accent);

return a.model();
