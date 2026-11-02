meta({
  name: 'industrial-wash-station',
  license: 'CC0-1.0',
  title: 'Parts wash station',
  description: 'Factory parts wash station with deep tank, drain basket, hinged lid and front control box. Knobs: size, tank, steel and safety colours.',
  tags: ['parts washer', 'wash station', 'factory', 'industrial', 'maintenance'],
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
const a = assembly('industrial-wash-station');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1350 * S, D = 850 * S, H = 760 * S;
block('cabinet', W, D, H, 0, 0, 120 * S, body);
block('wash-tank', W * 0.86, D * 0.78, 300 * S, 0, 0, H + 120 * S, steel);
block('basket-rim', W * 0.76, D * 0.68, 38 * S, 0, 0, H + 420 * S, accent);
block('lid', W * 0.9, D * 0.85, 55 * S, 0, 0, H + 750 * S, body);
block('control', 320 * S, 42 * S, 250 * S, W * 0.3, -D / 2 - 24 * S, 240 * S, accent);
for (let i = 0; i < 4; i++) block(`leg-${i}`, 100 * S, 100 * S, 120 * S, (i < 2 ? -1 : 1) * W * 0.4, (i % 2 ? 1 : -1) * D * 0.38, 0, steel);

return a.model();
