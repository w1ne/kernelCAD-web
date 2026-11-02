meta({
  name: 'panel-filter-unit',
  license: 'CC0-1.0',
  title: 'Panel filter unit',
  description: 'Compact industrial panel filter with pleated filter pack, clamping frame and differential-pressure indicator. Knobs: size, filter, steel and safety colours.',
  tags: ['panel filter', 'industrial air filter', 'factory', 'industrial'],
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
const a = assembly('panel-filter-unit');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1120 * S, D = 500 * S, H = 920 * S;
block('frame', W, D, H, 0, 0, 0, steel);
for (let i = 0; i < 9; i++) block(`filter-pleat-${i}`, 34 * S, D * 0.84, H * 0.86, (i - 4) * W / 10, 0, 40 * S, i % 2 ? body : accent);
for (const y of [-D / 2, D / 2]) block(`clamp-${y < 0 ? 'a' : 'b'}`, W + 80 * S, 42 * S, H + 70 * S, 0, y, 0, steel);
a.part('pressure-indicator', ngon(85 * S, 8).extrude(28 * S).rotateX(90).translate(W * 0.36, -D / 2 - 25 * S, H * 0.72).color(accent));

return a.model();
