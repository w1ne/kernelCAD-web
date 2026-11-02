meta({
  name: 'eyewash-station',
  license: 'CC0-1.0',
  title: 'Pedestal eyewash station',
  description: 'Pedestal eyewash unit with foot plate, twin spray bowls, crossbar, water inlet and pull flag. Knobs: size, pipe, steel and safety colours.',
  tags: ['eyewash station', 'safety equipment', 'factory', 'industrial'],
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
const a = assembly('eyewash-station');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const H = 1250 * S;
block('floor-plate', 420 * S, 420 * S, 40 * S, 0, 0, 0, steel);
post('pedestal', 38 * S, H, 0, 0, 40 * S, body);
beamX('spray-header', 500 * S, 26 * S, -250 * S, 0, H - 80 * S, accent);
for (let i = 0; i < 2; i++) {
  const x = (i ? 1 : -1) * 175 * S;
  a.part(`bowl-${i}`, ngon(120 * S, 8).extrude(42 * S).translate(x, 0, H - 145 * S).color(steel));
  a.part(`nozzle-${i}`, ngon(36 * S, 8).extrude(55 * S).translate(x, 0, H - 205 * S).color(accent));
}
beamZ('pull-handle', 280 * S, 24 * S, -300 * S, 0, H - 380 * S, accent);

return a.model();
