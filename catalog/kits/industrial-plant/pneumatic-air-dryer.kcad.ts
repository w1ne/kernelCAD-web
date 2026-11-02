meta({
  name: 'pneumatic-air-dryer',
  license: 'CC0-1.0',
  title: 'Compressed air dryer',
  description: 'Refrigerated compressed-air dryer with cabinet, condensate drain, pipe connections and status panel. Knobs: size, casing, steel and safety colours.',
  tags: ['air dryer', 'compressed air', 'factory', 'industrial'],
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
const a = assembly('pneumatic-air-dryer');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));
const beamY = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateX(90).translate(x, y + length, z).color(c));
const beamZ = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => post(name, r, length, x, y, z, c);
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const W = 820 * S, D = 620 * S, H = 1450 * S;
block('base', W + 80 * S, D + 80 * S, 100 * S, 0, 0, 0, steel);
block('cabinet', W, D, H, 0, 0, 100 * S, body);
block('front-panel', W * 0.72, 35 * S, H * 0.8, 0, -D / 2 - 20 * S, 180 * S, steel);
block('display', 220 * S, 30 * S, 140 * S, -W * 0.18, -D / 2 - 42 * S, H + 620 * S, accent);
for (let i = 0; i < 2; i++) a.part(`air-port-${i}`, ngon(90 * S, 8).extrude(160 * S).rotateX(90).translate((i ? 1 : -1) * W * 0.25, D / 2, 360 * S).color(steel));
a.part('drain', ngon(32 * S, 8).extrude(140 * S).translate(W * 0.3, 0, 0).color(accent));

return a.model();
