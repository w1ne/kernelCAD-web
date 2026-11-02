meta({
  name: 'overhead-crane',
  license: 'CC0-1.0',
  title: 'Overhead gantry crane',
  description: 'Floor-mounted overhead gantry crane with tall end frames, bridge beam, travel trolley and hanging hook. Knobs: size, frame, steel and safety colours.',
  tags: ['overhead crane', 'gantry crane', 'factory', 'industrial', 'material handling'],
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
const a = assembly('overhead-crane');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);


const W = 2600 * S, H = 2400 * S;
for (let side = -1; side <= 1; side += 2) {
  const x = side * W * 0.43;
  for (let y = -650 * S; y <= 650 * S; y += 1300 * S) post(`leg-${side}-${y < 0 ? 'a' : 'b'}`, 70 * S, H, x, y, 0, steel);
  beamY(`end-beam-${side}`, 1450 * S, 65 * S, x, -725 * S, H - 150 * S, accent);
}
beamX('bridge', W * 0.95, 95 * S, -W * 0.475, 0, H - 80 * S, body);
block('trolley', 420 * S, 400 * S, 180 * S, 0, 0, H - 300 * S, accent);
beamZ('hoist-chain', 420 * S, 22 * S, 0, 0, H - 720 * S, steel);
block('hook', 110 * S, 80 * S, 130 * S, 0, 0, H - 850 * S, steel);

return a.model();
