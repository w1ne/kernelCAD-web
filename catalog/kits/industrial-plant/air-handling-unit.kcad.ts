meta({
  name: 'air-handling-unit',
  license: 'CC0-1.0',
  title: 'Air handling unit',
  description: 'Modular air handling unit with filter bay, fan section, service doors, intake louvre and support plinth. Knobs: size, casing, steel and safety colours.',
  tags: ['air handling unit', 'AHU', 'HVAC', 'factory', 'industrial'],
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
const a = assembly('air-handling-unit');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 2100 * S, D = 820 * S, H = 1050 * S;
block('plinth', W + 100 * S, D + 100 * S, 100 * S, 0, 0, 0, steel);
block('filter-bay', W * 0.34, D, H, -W * 0.32, 0, 100 * S, body);
block('fan-bay', W * 0.42, D, H, W * 0.06, 0, 100 * S, steel);
block('coil-bay', W * 0.28, D, H, W * 0.4, 0, 100 * S, body);
for (let i = 0; i < 4; i++) block(`service-door-${i}`, W * 0.22, 28 * S, H * 0.8, -W * 0.32 + i * W * 0.21, -D / 2 - 16 * S, 180 * S, i === 0 ? accent : body);
a.part('fan-ring', ringZ(235 * S, 36 * S, W * 0.06, 0, H + 100 * S, accent));

return a.model();
