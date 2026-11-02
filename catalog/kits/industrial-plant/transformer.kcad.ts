meta({
  name: 'transformer',
  license: 'CC0-1.0',
  title: 'Industrial power transformer',
  description: 'Distribution transformer with tank, cooling banks, terminal bushings, lifting lugs and a safety-colour base. Knobs: size, tank, steel and safety colours.',
  tags: ['transformer', 'substation', 'power distribution', 'factory', 'industrial'],
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
const a = assembly('transformer');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1050 * S, D = 760 * S, H = 1020 * S;
block('base', W + 180 * S, D + 120 * S, 100 * S, 0, 0, 0, steel);
block('tank', W, D, H, 0, 0, 100 * S, body);
for (let i = 0; i < 7; i++) {
  const x = (i - 3) * 135 * S;
  block(`radiator-${i}`, 48 * S, D * 0.82, H * 0.72, x, D / 2 + 22 * S, 220 * S, steel);
}
for (let i = 0; i < 3; i++) {
  const x = (i - 1) * 220 * S;
  a.part(`bushing-${i}`, ngon(72 * S, 8).extrude(230 * S).translate(x, 0, H + 100 * S).color(accent));
  a.part(`bushing-cap-${i}`, ngon(92 * S, 8).extrude(28 * S).translate(x, 0, H + 310 * S).color(steel));
}

return a.model();
