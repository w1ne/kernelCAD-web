meta({
  name: 'plate-heat-exchanger',
  license: 'CC0-1.0',
  title: 'Plate heat exchanger',
  description: 'Compact plate heat exchanger with clamped plate pack, tie rods, end frame and four service ports. Knobs: size, plate pack, steel and safety colours.',
  tags: ['plate heat exchanger', 'process equipment', 'factory', 'industrial'],
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
const a = assembly('plate-heat-exchanger');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const W = 760 * S, H = 1200 * S;
block('base', 960 * S, 420 * S, 70 * S, 0, 0, 0, steel);
block('fixed-frame', 90 * S, 440 * S, H, -W / 2, 0, 70 * S, body);
block('movable-frame', 90 * S, 440 * S, H, W / 2, 0, 70 * S, steel);
for (let i = 0; i < 8; i++) block(`plate-${i}`, 24 * S, 360 * S, H * 0.82, -W * 0.38 + i * W * 0.108, 0, 140 * S, i % 2 ? body : accent);
for (let i = 0; i < 4; i++) beamX(`tie-${i}`, W + 180 * S, 24 * S, -W / 2 - 90 * S, (i % 2 ? 1 : -1) * 170 * S, (i < 2 ? 1 : -1) * H * 0.34 + H * 0.52, steel);

return a.model();
