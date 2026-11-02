meta({
  name: 'dust-collector',
  license: 'CC0-1.0',
  title: 'Baghouse dust collector',
  description: 'Baghouse collector with four filter compartments, hopper discharge and a top clean-air plenum. Knobs: size, shell, steel and safety colours.',
  tags: ['baghouse', 'dust collector', 'factory', 'industrial', 'filter'],
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
const a = assembly('dust-collector');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 1500 * S, D = 760 * S, H = 1450 * S;
block('hopper', W * 0.8, D * 0.8, 510 * S, 0, 0, 0, steel);
block('filter-house', W, D, H, 0, 0, 510 * S, body);
block('clean-air-plenum', W + 100 * S, D + 60 * S, 270 * S, 0, 0, 1960 * S, steel);
for (let i = 0; i < 4; i++) {
  const x = (i - 1.5) * W * 0.2;
  block(`access-door-${i}`, W * 0.17, 24 * S, H * 0.72, x, -D / 2 - 14 * S, 660 * S, i === 0 ? accent : body);
}
a.part('outlet', ngon(110 * S, 8).extrude(350 * S).translate(0, 0, 0).color(accent));
for (let i = 0; i < 4; i++) block(`leg-${i}`, 90 * S, 90 * S, 460 * S, (i % 2 ? 1 : -1) * W * 0.38, (i < 2 ? 1 : -1) * D * 0.32, 0, steel);

return a.model();
