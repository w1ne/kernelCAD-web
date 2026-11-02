meta({
  name: 'cooling-tower-cell',
  license: 'CC0-1.0',
  title: 'Modular cooling tower cell',
  description: 'Modular cooling tower cell with louvred basin, tapered body, top fan deck and corner service supports. Knobs: size, casing, steel and safety colours.',
  tags: ['cooling tower cell', 'cooling plant', 'factory', 'industrial'],
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
const a = assembly('cooling-tower-cell');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1150 * S, D = 1050 * S, H = 1850 * S;
block('basin', W, D, 240 * S, 0, 0, 0, body);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
a.part('tower', rect(W * 0.92, D * 0.92).loft(rect(W * 0.72, D * 0.72), { spacing: H, ruled: true }).translate(0, 0, 240 * S).color(steel));
for (let i = 0; i < 5; i++) block(`louvre-${i}`, W * 0.82, 35 * S, 60 * S, 0, -D * 0.48, 300 * S + i * 130 * S, accent);
block('fan-deck', W * 0.76, D * 0.76, 95 * S, 0, 0, H + 220 * S, body);
a.part('fan-ring', ringZ(235 * S, 34 * S, 0, 0, H + 315 * S, accent));

return a.model();
