meta({
  name: 'screw-conveyor',
  license: 'CC0-1.0',
  title: 'Screw conveyor',
  description: 'Covered trough screw conveyor with end bearings, motor drive, support stands and a discharge spout. Knobs: size, flight count, steel and safety colours.',
  tags: ['screw conveyor', 'auger conveyor', 'bulk handling', 'factory', 'industrial'],
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
const flightChoice = param('flights', '6', { choices: ['4', '6', '8'], label: 'Flight count' });
const flights = Number(flightChoice.value);
presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('screw-conveyor');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 2100 * S, W = 360 * S, z = 660 * S;
block('trough', L, W, 220 * S, 0, 0, z, body);
block('cover', L, W * 0.82, 48 * S, 0, 0, z + 220 * S, steel);
beamX('auger-shaft', L * 0.9, 38 * S, -L * 0.45, 0, z + 125 * S, accent);
for (let i = 0; i < flights; i++) a.part(`flight-${i}`, ngon(140 * S, 6).extrude(26 * S).rotateY(90).translate(-L * 0.42 + i * L * 0.84 / flights, 0, z + 125 * S).color(i % 2 ? steel : accent));
for (const x of [-L * 0.34, L * 0.34]) block(`support-${x < 0 ? 'a' : 'b'}`, 120 * S, W + 100 * S, z, x, 0, 0, steel);
a.part('discharge', ngon(95 * S, 8).extrude(240 * S).translate(L * 0.3, 0, z - 240 * S).color(accent));

return a.model();
