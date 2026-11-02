meta({
  name: 'chiller-unit',
  license: 'CC0-1.0',
  title: 'Air-cooled chiller unit',
  description: 'Packaged rooftop chiller with louvred side panels, two top condenser fans, skid base and service end. Knobs: size, casing, steel and safety colours.',
  tags: ['chiller', 'HVAC', 'air cooled chiller', 'factory', 'industrial'],
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
const a = assembly('chiller-unit');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1700 * S, D = 850 * S, H = 900 * S;
block('skid', W + 100 * S, D + 80 * S, 90 * S, 0, 0, 0, steel);
block('cabinet', W, D, H, 0, 0, 90 * S, body);
for (let i = 0; i < 6; i++) block(`louver-${i}`, W * 0.85, 25 * S, 34 * S, 0, -D / 2 - 14 * S, (i + 1) * 105 * S, steel);
for (let i = 0; i < 2; i++) {
  const x = (i - 0.5) * 720 * S;
  a.part(`fan-shroud-${i}`, ringZ(260 * S, 40 * S, x, 0, 990 * S, steel));
  a.part(`fan-hub-${i}`, ngon(70 * S, 8).extrude(54 * S).translate(x, 0, 1030 * S).color(accent));
}
block('service-panel', 360 * S, 35 * S, 560 * S, W / 2 + 20 * S, 0, 160 * S, accent);

return a.model();
