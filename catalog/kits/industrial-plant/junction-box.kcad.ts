meta({
  name: 'junction-box',
  license: 'CC0-1.0',
  title: 'Industrial junction box',
  description: 'Wall-mounted junction box with hinged lid, cable glands, mounting ears and a single status beacon. Knobs: size, enclosure, steel and safety colours.',
  tags: ['junction box', 'electrical enclosure', 'cable entry', 'factory', 'industrial'],
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
const a = assembly('junction-box');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 580 * S, D = 260 * S, H = 620 * S;
block('back-plate', W + 100 * S, 48 * S, H + 80 * S, 0, D / 2, 0, steel);
block('box', W, D, H, 0, 0, 70 * S, body);
block('lid', W * 0.88, 42 * S, H * 0.86, 0, -D / 2 - 18 * S, 110 * S, accent);
for (let i = 0; i < 4; i++) a.part(`gland-${i}`, ngon(48 * S, 8).extrude(72 * S).rotateX(90).translate((i - 1.5) * 130 * S, D / 2 + 1 * S, 80 * S).color(steel));
a.part('status-lamp', ngon(42 * S, 8).extrude(86 * S).translate(0, 0, H + 70 * S).color(accent));

return a.model();
