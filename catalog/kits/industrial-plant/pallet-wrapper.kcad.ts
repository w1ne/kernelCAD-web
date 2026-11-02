meta({
  name: 'pallet-wrapper',
  license: 'CC0-1.0',
  title: 'Pallet stretch wrapper',
  description: 'Turntable stretch wrapper with pallet plate, film mast, carriage, control pendant and safety-colour stop buttons. Knobs: size, frame, steel and safety colours.',
  tags: ['pallet wrapper', 'stretch wrap machine', 'packaging', 'factory', 'industrial'],
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
const a = assembly('pallet-wrapper');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 720 * S, H = 2050 * S;
a.part('turntable', ngon(R, 12).extrude(90 * S).translate(0, 0, 0).color(body));
post('mast', 70 * S, H, R * 0.9, 0, 90 * S, steel);
block('mast-base', 250 * S, 260 * S, 170 * S, R * 0.9, 0, 90 * S, accent);
block('film-carriage', 220 * S, 190 * S, 470 * S, R * 0.9, 0, 700 * S, body);
beamY('film-roll', 160 * S, 65 * S, R * 0.9, -80 * S, 900 * S, steel);
block('pendant', 90 * S, 45 * S, 260 * S, R * 0.72, -300 * S, 450 * S, accent);

return a.model();
