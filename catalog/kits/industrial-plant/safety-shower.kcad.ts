meta({
  name: 'safety-shower',
  license: 'CC0-1.0',
  title: 'Emergency safety shower',
  description: 'Industrial emergency shower station with pull handle, overhead spray head, eyewash arms and floor plate. Knobs: size, pipe, steel and safety colours.',
  tags: ['safety shower', 'emergency shower', 'eyewash', 'factory', 'industrial'],
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
const a = assembly('safety-shower');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);


const H = 2250 * S;
block('floor-plate', 500 * S, 500 * S, 40 * S, 0, 0, 0, steel);
post('riser', 42 * S, H - 120 * S, 0, 0, 40 * S, accent);
beamX('shower-arm', 440 * S, 32 * S, -220 * S, 0, H - 80 * S, steel);
a.part('shower-head', ngon(160 * S, 8).extrude(55 * S).translate(220 * S, 0, H - 135 * S).color(body));
beamX('eyewash-arm', 360 * S, 25 * S, -180 * S, -100 * S, 900 * S, accent);
for (let i = 0; i < 2; i++) a.part(`eyewash-bowl-${i}`, ngon(100 * S, 8).extrude(35 * S).translate((i ? 120 : -120) * S, -100 * S, 880 * S).color(body));
beamZ('pull-rod', 350 * S, 20 * S, -300 * S, 0, H - 450 * S, accent);

return a.model();
