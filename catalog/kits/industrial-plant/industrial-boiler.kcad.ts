meta({
  name: 'industrial-boiler',
  license: 'CC0-1.0',
  title: 'Industrial boiler',
  description: 'Packaged boiler with horizontal pressure shell, firebox, access door, stack and service platform. Knobs: size, shell, steel and safety colours.',
  tags: ['boiler', 'steam plant', 'industrial heater', 'factory', 'industrial'],
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
const a = assembly('industrial-boiler');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 1700 * S, R = 420 * S, zc = 700 * S;
a.part('boiler-shell', ngon(R, 10).extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(body));
a.part('front-head', ngon(R * 0.94, 10).extrude(44 * S).rotateY(90).translate(-L / 2 - 44 * S, 0, zc).color(steel));
block('firebox', 850 * S, 820 * S, 620 * S, 0, 0, 0, steel);
a.part('fire-door', ngon(240 * S, 8).extrude(45 * S).rotateX(90).translate(0, -425 * S, 280 * S).color(accent));
a.part('stack', ngon(110 * S, 8).extrude(900 * S).translate(L * 0.32, 0, 950 * S).color(steel));
a.part('stack-cap', ringZ(125 * S, 18 * S, L * 0.32, 0, 1840 * S, accent));
for (const x of [-L * 0.28, L * 0.28]) block(`foot-${x < 0 ? 'left' : 'right'}`, 180 * S, 520 * S, 250 * S, x, 0, 0, steel);

return a.model();
