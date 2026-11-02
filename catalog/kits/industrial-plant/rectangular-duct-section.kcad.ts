meta({
  name: 'rectangular-duct-section',
  license: 'CC0-1.0',
  title: 'Rectangular ventilation duct',
  description: 'Straight sheet-metal ventilation duct section with four corner seams, flanged ends and a top inspection hatch. Knobs: size, duct, steel and safety colours.',
  tags: ['rectangular duct', 'HVAC duct', 'ventilation', 'factory', 'industrial'],
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
const a = assembly('rectangular-duct-section');
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const L = 1500 * S, W = 600 * S, D = 420 * S;
block('duct-shell', L, W, D, 0, 0, 0, body);
for (const x of [-L / 2 + 35 * S, L / 2 - 35 * S]) {
  block(`flange-x-${x < 0 ? 'a' : 'b'}`, 55 * S, W + 100 * S, D + 100 * S, x, 0, 0, steel);
}
for (let i = 0; i < 4; i++) block(`corner-seam-${i}`, L, 24 * S, 28 * S, 0, (i % 2 ? 1 : -1) * (W / 2 - 24 * S), i < 2 ? 0 : D - 28 * S, accent);
block('inspection-hatch', 310 * S, 280 * S, 32 * S, 0, 0, D / 2 + 18 * S, steel);

return a.model();
