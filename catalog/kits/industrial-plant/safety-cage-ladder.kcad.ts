meta({
  name: 'safety-cage-ladder',
  license: 'CC0-1.0',
  title: 'Caged fixed access ladder',
  description: 'Fixed steel access ladder with safety hoop cage, wall brackets, top handholds and non-slip feet. Knobs: size, rung count, steel and safety colours.',
  tags: ['fixed ladder', 'caged ladder', 'industrial access', 'factory', 'industrial'],
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
const stepChoice = param('stepCount', '8', { choices: ['6', '8', '10'], label: 'Rungs' });
const stepCount = Number(stepChoice.value);
presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('safety-cage-ladder');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 6).extrude(width).subtract(ngon(r - 14 * S, 6).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const H = 2700 * S, steps = stepCount;
for (let i = 0; i < 2; i++) beamZ(`side-rail-${i}`, H, 35 * S, (i ? 1 : -1) * 220 * S, 0, 0, steel);
for (let i = 1; i <= steps; i++) beamY(`rung-${i}`, 420 * S, 24 * S, 0, -210 * S, i * H / (steps + 1), accent);
for (let z = 900 * S; z < H - 200 * S; z += 600 * S) {
  a.part(`cage-hoop-${z}`, ringZ(370 * S, 24 * S, 0, 0, z, body));
}
for (let i = 0; i < 4; i++) block(`wall-bracket-${i}`, 330 * S, 55 * S, 40 * S, 0, 130 * S, (i + 1) * H / 5, steel);

return a.model();
