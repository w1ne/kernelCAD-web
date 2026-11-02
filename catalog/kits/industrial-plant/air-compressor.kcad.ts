meta({
  name: 'air-compressor',
  license: 'CC0-1.0',
  title: 'Air compressor package',
  description: 'Reciprocating compressor package with horizontal receiver, twin pump heads, motor, pressure switch and handle. Knobs: size, tank, steel and safety colours.',
  tags: ['air compressor', 'compressor', 'receiver tank', 'factory', 'industrial'],
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
const a = assembly('air-compressor');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 1350 * S, R = 270 * S, zc = R + 120 * S;
a.part('receiver', ngon(R, 8).extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(body));
for (const x of [-L * 0.32, L * 0.32]) block(`tank-foot-${x < 0 ? 'a' : 'b'}`, 190 * S, 430 * S, 120 * S, x, 0, 0, steel);
a.part('motor', ngon(135 * S, 8).extrude(460 * S).rotateY(90).translate(-190 * S, 0, 2 * R + 220 * S).color(steel));
for (let i = 0; i < 2; i++) {
  const x = (i - 0.5) * 270 * S;
  block(`pump-head-${i}`, 170 * S, 170 * S, 230 * S, x, 0, 2 * R + 150 * S, accent);
}
a.part('pressure-switch', ngon(55 * S, 8).extrude(150 * S).translate(0, 0, zc + R).color(accent));

return a.model();
