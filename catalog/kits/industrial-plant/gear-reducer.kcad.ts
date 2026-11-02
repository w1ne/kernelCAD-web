meta({
  name: 'gear-reducer',
  license: 'CC0-1.0',
  title: 'Industrial gear reducer',
  description: 'Floor-mounted gear reducer with stepped casing, inspection cover, feet and two keyed shafts. Knobs: size, casing, steel and safety colours.',
  tags: ['gear reducer', 'gearbox', 'drive reducer', 'factory', 'industrial'],
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
const a = assembly('gear-reducer');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


block('base', 980 * S, 700 * S, 85 * S, 0, 0, 0, steel);
block('lower-case', 780 * S, 600 * S, 380 * S, 0, 0, 85 * S, body);
block('upper-case', 550 * S, 470 * S, 360 * S, 40 * S, 0, 465 * S, body);
a.part('inspection-cover', ngon(190 * S, 8).extrude(34 * S).rotateX(90).translate(0, -305 * S, 250 * S).color(accent));
beamX('input-shaft', 260 * S, 58 * S, -650 * S, 0, 300 * S, steel);
beamX('output-shaft', 300 * S, 82 * S, 390 * S, 0, 600 * S, accent);

return a.model();
