meta({
  name: 'hydraulic-power-unit',
  license: 'CC0-1.0',
  title: 'Hydraulic power unit',
  description: 'Hydraulic power unit with reservoir, electric motor, pump head, manifold and return filter. Knobs: size, tank, steel and safety colours.',
  tags: ['hydraulic power unit', 'hydraulic pump', 'factory', 'industrial', 'machine'],
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
const a = assembly('hydraulic-power-unit');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);


const W = 1150 * S, D = 620 * S, H = 700 * S;
block('reservoir', W, D, H, 0, 0, 0, body);
block('lid', W + 40 * S, D + 40 * S, 70 * S, 0, 0, H, steel);
a.part('motor', ngon(145 * S, 8).extrude(420 * S).rotateY(90).translate(-220 * S, 0, H + 170 * S).color(accent));
block('pump-head', 280 * S, 260 * S, 240 * S, 140 * S, 0, H + 80 * S, steel);
a.part('return-filter', ngon(75 * S, 8).extrude(260 * S).translate(-W * 0.3, 0, H + 70 * S).color(accent));
for (let i = 0; i < 3; i++) beamZ(`manifold-port-${i}`, 140 * S, 38 * S, 300 * S + i * 110 * S, 170 * S, H + 150 * S, steel);

return a.model();
