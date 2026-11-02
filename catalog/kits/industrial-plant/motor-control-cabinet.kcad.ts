meta({
  name: 'motor-control-cabinet',
  license: 'CC0-1.0',
  title: 'Motor control cabinet',
  description: 'Multi-bay motor control centre with recessed door panels, indicator lights, ventilation slots and plinth. Knobs: size, cabinet, steel and safety colours.',
  tags: ['motor control centre', 'MCC cabinet', 'electrical cabinet', 'factory', 'industrial'],
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
const a = assembly('motor-control-cabinet');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1800 * S, D = 520 * S, H = 1900 * S;
block('plinth', W + 50 * S, D + 50 * S, 120 * S, 0, 0, 0, steel);
block('enclosure', W, D, H, 0, 0, 120 * S, body);
for (let i = 0; i < 4; i++) {
  const x = (i - 1.5) * W * 0.24;
  block(`door-${i}`, W * 0.22, 32 * S, H * 0.82, x, -D / 2 - 18 * S, 220 * S, i === 0 ? accent : body);
  for (let j = 0; j < 3; j++) a.part(`indicator-${i}-${j}`, ngon(24 * S, 8).extrude(18 * S).rotateX(90).translate(x - 55 * S + j * 55 * S, -D / 2 - 40 * S, H + 200 * S).color(j === 1 ? accent : steel));
}

return a.model();
