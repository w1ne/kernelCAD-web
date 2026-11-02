meta({
  name: 'generator-set',
  license: 'CC0-1.0',
  title: 'Diesel generator set',
  description: 'Enclosed generator skid with louvred canopy, engine base, exhaust stack and service control panel. Knobs: size, canopy, steel and safety colours.',
  tags: ['generator set', 'diesel generator', 'power plant', 'factory', 'industrial'],
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
const a = assembly('generator-set');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1800 * S, D = 850 * S, H = 1050 * S;
block('skid', W + 100 * S, D + 80 * S, 100 * S, 0, 0, 0, steel);
block('canopy', W, D, H, 0, 0, 100 * S, body);
for (let i = 0; i < 8; i++) block(`side-louver-${i}`, 24 * S, 28 * S, 680 * S, -W / 2 - 14 * S, (i - 3.5) * 76 * S, 220 * S, steel);
block('control-panel', 360 * S, 70 * S, 390 * S, W / 2 + 22 * S, -D * 0.2, 380 * S, accent);
a.part('exhaust', ngon(78 * S, 8).extrude(420 * S).translate(W * 0.25, 0, H + 100 * S).color(steel));
a.part('exhaust-cap', ngon(105 * S, 8).extrude(38 * S).translate(W * 0.25, 0, H + 490 * S).color(accent));

return a.model();
