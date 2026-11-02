meta({
  name: 'air-cooled-condenser',
  license: 'CC0-1.0',
  title: 'Air-cooled condenser bank',
  description: 'Compact air-cooled condenser bank with finned coil panels, twin top fans, end headers and skid rails. Knobs: size, coil, steel and safety colours.',
  tags: ['condenser', 'air cooled', 'heat rejection', 'factory', 'industrial'],
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
const a = assembly('air-cooled-condenser');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1800 * S, D = 900 * S, H = 850 * S;
block('base', W + 100 * S, D + 100 * S, 80 * S, 0, 0, 0, steel);
block('coil-bank', W, D, H, 0, 0, 80 * S, body);
for (let i = 0; i < 8; i++) block(`coil-fin-${i}`, 28 * S, D + 18 * S, H * 0.82, (i - 3.5) * W / 9, 0, 130 * S, steel);
for (let i = 0; i < 2; i++) {
  const x = (i - 0.5) * 720 * S;
  a.part(`fan-ring-${i}`, ringZ(250 * S, 34 * S, x, 0, H + 80 * S, accent));
  a.part(`fan-hub-${i}`, ngon(80 * S, 8).extrude(60 * S).translate(x, 0, H + 115 * S).color(steel));
}

return a.model();
