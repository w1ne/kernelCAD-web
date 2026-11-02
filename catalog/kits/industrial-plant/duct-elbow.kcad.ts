meta({
  name: 'duct-elbow',
  license: 'CC0-1.0',
  title: 'Rectangular duct elbow',
  description: 'Square ventilation duct elbow with segmented corner panels, flange rims and a side inspection plate. Knobs: size, duct, steel and safety colours.',
  tags: ['duct elbow', 'HVAC', 'ventilation', 'factory', 'industrial'],
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
const a = assembly('duct-elbow');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 650 * S, D = 450 * S;
block('vertical-leg', W, D, 900 * S, 0, 0, 0, body);
block('horizontal-leg', 900 * S, D, W, 450 * S, 0, 900 * S - W, body);
block('elbow-outer', W, D, W, 450 * S, 0, 900 * S - W, steel);
for (const z of [180, 760]) block(`vertical-flange-${z}`, W + 80 * S, D + 80 * S, 45 * S, 0, 0, z * S, steel);
block('inspection-plate', 280 * S, 35 * S, 300 * S, -W / 2 - 20 * S, 0, 320 * S, accent);

return a.model();
