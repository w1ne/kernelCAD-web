meta({
  name: 'industrial-flue-stack',
  license: 'CC0-1.0',
  title: 'Industrial exhaust stack',
  description: 'Segmented exhaust stack with ring stiffeners, base plate, service ladder and rain cap. Knobs: size, stack height, body, steel and safety colours.',
  tags: ['exhaust stack', 'flue', 'industrial chimney', 'factory', 'industrial'],
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
const stackChoice = param('heightMm', '2800', { choices: ['2200', '2800', '3600'], label: 'Height (mm)' });
const stackHeight = Number(stackChoice.value);
presets({ stainless: { body: '#aeb9b9', steel: '#596468', accent: '#cc9d20' }, safety: { body: '#e4c34b', accent: '#cf3f31' } });
const S = Number(scale.value);
const a = assembly('industrial-flue-stack');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const H = stackHeight, R = 250 * S;
a.part('stack-shell', ngon(R, 8).extrude(H).color(body));
for (let i = 0; i < 3; i++) a.part(`stiffener-${i}`, ringZ(R + 24 * S, 32 * S, 0, 0, (i + 1) * H / 4, steel));
a.part('base', ringZ(R + 125 * S, 42 * S, 0, 0, 0, accent));
a.part('cap', ngon(R + 80 * S, 8).extrude(48 * S).translate(0, 0, H - 30 * S).color(steel));
for (let i = 0; i < 2; i++) post(`ladder-rail-${i}`, 22 * S, H - 200 * S, (i ? 1 : -1) * 160 * S, -R - 28 * S, 80 * S, accent);
for (let z = 180 * S; z < H - 100 * S; z += 500 * S) beamX(`ladder-rung-${z}`, 320 * S, 18 * S, -160 * S, -R - 28 * S, z, steel);

return a.model();
