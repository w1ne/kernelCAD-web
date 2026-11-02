meta({
  name: 'cable-reel',
  license: 'CC0-1.0',
  title: 'Industrial cable reel',
  description: 'Heavy cable reel with flanged drum, visible wound cable bands, central axle and freestanding support frame. Knobs: size, flange, steel and cable colours.',
  tags: ['cable reel', 'wire reel', 'cable drum', 'factory', 'industrial'],
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
const a = assembly('cable-reel');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 560 * S, W = 620 * S, zc = R + 180 * S;
block('frame-base', 1300 * S, 900 * S, 80 * S, 0, 0, 0, steel);
for (let i = 0; i < 2; i++) block(`upright-${i}`, 90 * S, 110 * S, zc + 80 * S, 0, (i ? 1 : -1) * 350 * S, 0, steel);
beamY('axle', W + 180 * S, 65 * S, 0, -W / 2 - 90 * S, zc, accent);
for (let y of [-W / 2, W / 2]) a.part(`flange-${y < 0 ? 'a' : 'b'}`, ngon(R, 12).extrude(55 * S).rotateX(90).translate(0, y + W / 2, zc).color(body));
for (let i = 0; i < 4; i++) beamY(`cable-wrap-${i}`, W * 0.76, 24 * S, 0, -W * 0.38, zc + (i - 1.5) * 55 * S, accent);

return a.model();
