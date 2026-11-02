meta({
  name: 'roller-conveyor-section',
  license: 'CC0-1.0',
  title: 'Gravity roller conveyor section',
  description: 'Gravity roller conveyor with closely spaced faceted rollers, side guides and adjustable leg pairs. Knobs: size, roller count, steel and safety colours.',
  tags: ['roller conveyor', 'material handling', 'factory', 'industrial'],
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
const rollerChoice = param('rollers', '6', { choices: ['4', '6', '8'], label: 'Rollers' });
const rollerCount = Number(rollerChoice.value);
presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('roller-conveyor-section');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));


const L = 2100 * S, W = 660 * S, top = 760 * S;
block('frame', L, W, 70 * S, 0, 0, top - 70 * S, body);
for (let i = 0; i < rollerCount; i++) {
  const x = (i - (rollerCount - 1) / 2) * L / rollerCount;
  beamY(`roller-${i}`, W * 0.9, 42 * S, x, -W * 0.45, top + 10 * S, steel);
}
for (const y of [-W / 2, W / 2]) block(`guide-${y < 0 ? 'a' : 'b'}`, L, 34 * S, 130 * S, 0, y, top, accent);
for (const x of [-L * 0.32, L * 0.32]) for (const y of [-W * 0.35, W * 0.35]) post(`leg-${x < 0 ? 'a' : 'b'}-${y < 0 ? 'a' : 'b'}`, 36 * S, top - 70 * S, x, y, 0, steel);

return a.model();
