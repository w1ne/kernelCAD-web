meta({
  name: 'axial-exhaust-fan',
  license: 'CC0-1.0',
  title: 'Axial exhaust fan',
  description: 'Wall-mounted axial fan with square frame, round guard ring, central hub and four broad blades. Knobs: size, frame, steel and safety colours.',
  tags: ['axial fan', 'exhaust fan', 'ventilation', 'factory', 'industrial'],
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
const a = assembly('axial-exhaust-fan');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 980 * S, R = 390 * S, z = 520 * S;
block('wall-frame', W, 110 * S, W, 0, 0, 0, body);
a.part('guard-ring', ringZ(R, 48 * S, 0, 0, 0, steel).rotateX(90).translate(0, -66 * S, z));
a.part('hub', ngon(105 * S, 8).extrude(110 * S).rotateX(90).translate(0, -55 * S, z).color(accent));
for (let i = 0; i < 4; i++) {
  const angle = i * Math.PI / 2, x = 130 * S * Math.cos(angle), bladeZ = z + 130 * S * Math.sin(angle);
  a.part(`blade-${i}`, box(240 * S, 48 * S, 90 * S, true).rotateY(i * 90).translate(x, -100 * S, bladeZ).color(i % 2 ? accent : steel));
}
let mount = 0;
for (const x of [-W * 0.39, W * 0.39]) {
  block(`mount-${mount++}`, 115 * S, 130 * S, 115 * S, x, 0, 0, steel);
  block(`mount-${mount++}`, 115 * S, 130 * S, 115 * S, x, 0, W - 115 * S, steel);
}

return a.model();
