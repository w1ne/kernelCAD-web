meta({
  name: 'centrifugal-pump',
  license: 'CC0-1.0',
  title: 'Centrifugal pump',
  description: 'End-suction centrifugal pump with volute housing, horizontal motor, baseplate, suction and discharge nozzles. Knobs: size, housing, steel and safety colours.',
  tags: ['centrifugal pump', 'water pump', 'process pump', 'factory', 'industrial'],
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
const a = assembly('centrifugal-pump');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const L = 800 * S, R = 280 * S;
block('baseplate', 1300 * S, 520 * S, 80 * S, 0, 0, 0, steel);
a.part('motor', ngon(205 * S, 8).extrude(L).rotateY(90).translate(-L * 0.38, 0, 340 * S).color(body));
a.part('motor-cap', ngon(175 * S, 8).extrude(55 * S).rotateY(90).translate(L * 0.38, 0, 340 * S).color(steel));
a.part('volute', ngon(R, 10).extrude(180 * S).rotateY(90).translate(L * 0.45, 0, 360 * S).color(body));
a.part('suction', ngon(105 * S, 8).extrude(240 * S).rotateX(90).translate(L * 0.54, 240 * S, 360 * S).color(accent));
a.part('discharge', ngon(105 * S, 8).extrude(260 * S).translate(L * 0.54, 0, 480 * S).color(steel));

return a.model();
