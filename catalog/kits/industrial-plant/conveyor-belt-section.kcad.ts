meta({
  name: 'conveyor-belt-section',
  license: 'CC0-1.0',
  title: 'Belt conveyor section',
  description: 'Straight belt conveyor with driven end drum, side rails, two support frames and an adjustable belt width. Knobs: size, belt, steel and safety colours.',
  tags: ['belt conveyor', 'material handling', 'factory', 'industrial', 'production line'],
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
const a = assembly('conveyor-belt-section');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 2300 * S, W = 620 * S, top = 720 * S;
block('belt', L, W, 45 * S, 0, 0, top, body);
for (const y of [-W / 2, W / 2]) block(`side-rail-${y < 0 ? 'a' : 'b'}`, L, 48 * S, 100 * S, 0, y, top + 40 * S, steel);
for (const x of [-L * 0.32, L * 0.32]) {
  for (const y of [-W * 0.38, W * 0.38]) post(`leg-${x < 0 ? 'a' : 'b'}-${y < 0 ? 'a' : 'b'}`, 42 * S, top, x, y, 0, steel);
  beamY(`crossbar-${x < 0 ? 'a' : 'b'}`, W * 0.78, 38 * S, x, -W * 0.39, 200 * S, accent);
}

return a.model();
