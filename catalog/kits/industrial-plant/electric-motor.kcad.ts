meta({
  name: 'electric-motor',
  license: 'CC0-1.0',
  title: 'Industrial electric motor',
  description: 'Ribbed induction motor with terminal box, cooling fan cover, mounting feet and projecting drive shaft. Knobs: size, housing, steel and safety colours.',
  tags: ['electric motor', 'induction motor', 'factory', 'industrial', 'machine'],
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
const a = assembly('electric-motor');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 900 * S, R = 280 * S;
block('mounting-feet', 1050 * S, 500 * S, 70 * S, 0, 0, 0, steel);
a.part('stator', ngon(R, 10).extrude(L).rotateY(90).translate(-L / 2, 0, R + 90 * S).color(body));
for (let i = 0; i < 7; i++) a.part(`cooling-rib-${i}`, ngon(R + 15 * S, 10).extrude(24 * S).rotateY(90).translate(-L * 0.36 + i * L * 0.12, 0, R + 90 * S).color(steel));
a.part('fan-cover', ngon(R * 0.78, 10).extrude(100 * S).rotateY(90).translate(L / 2, 0, R + 90 * S).color(steel));
a.part('shaft', ngon(68 * S, 8).extrude(240 * S).rotateY(90).translate(L / 2 + 95 * S, 0, R + 90 * S).color(accent));
block('terminal-box', 260 * S, 230 * S, 150 * S, -100 * S, 0, 2 * R + 30 * S, accent);

return a.model();
