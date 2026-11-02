meta({
  name: 'access-stair-tower',
  license: 'CC0-1.0',
  title: 'Industrial access stair tower',
  description: 'Open industrial stair flight with tread plates, twin stringers, landing guardrails and a top transition. Knobs: size, step count, steel and safety colours.',
  tags: ['industrial stairs', 'access tower', 'factory', 'industrial', 'maintenance'],
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
const stepChoice = param('stepCount', '7', { choices: ['5', '7', '9'], label: 'Steps' });
const stepCount = Number(stepChoice.value);
presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('access-stair-tower');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));


const steps = stepCount, rise = 220 * S, run = 260 * S;
const L = steps * run, H = steps * rise;
for (let i = 0; i < steps; i++) block(`tread-${i}`, run * 1.6, 280 * S, 48 * S, -L / 2 + (i + 0.5) * run, 0, (i + 0.5) * rise, i % 2 ? body : accent);
for (const y of [-130 * S, 130 * S]) {
  a.part(`stringer-${y < 0 ? 'a' : 'b'}`, box(Math.hypot(L, H) + 80 * S, 70 * S, 70 * S, true).rotateY(-Math.atan(H / L) * 180 / Math.PI).translate(0, y, H / 2 + 76 * S).color(steel));
  block(`lower-anchor-${y < 0 ? 'a' : 'b'}`, 170 * S, 220 * S, 24 * S, -L / 2, y, 0, steel);
}
for (let i = 0; i < 2; i++) {
  const y = i ? 150 * S : -150 * S;
  a.part(`handrail-${i}`, box(Math.hypot(L, H) + 30 * S, 32 * S, 32 * S, true).rotateY(-Math.atan(H / L) * 180 / Math.PI).translate(0, y, H / 2 + 950 * S).color(accent));
  for (let j = 0; j < steps; j++) post(`stanchion-${i}-${j}`, 20 * S, 950 * S, -L / 2 + (j + 0.5) * run, y, (j + 0.5) * rise, steel);
}

return a.model();
