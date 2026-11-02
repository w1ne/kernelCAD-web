meta({
  name: 'industrial-drum-mixer',
  license: 'CC0-1.0',
  title: 'Industrial drum mixer',
  description: 'Tilting drum mixer with polygon mixing drum, side trunnion, drive housing, support legs and handwheel. Knobs: size, drum, steel and safety colours.',
  tags: ['drum mixer', 'industrial mixer', 'factory', 'industrial'],
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
const a = assembly('industrial-drum-mixer');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const post = (name: string, r: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(h).translate(x, y, z).color(c));
const ringZ = (r: number, width: number, x: number, y: number, z: number, c = steel) => ngon(r, 8).extrude(width).subtract(ngon(r - 14 * S, 8).extrude(width + 2).translate(0, 0, -1)).translate(x, y, z).color(c);


const R = 520 * S, L = 920 * S, zc = 900 * S;
a.part('drum', ngon(R, 10).extrude(L).rotateY(90).translate(-L / 2, 0, zc).color(body));
for (let i = 0; i < 2; i++) a.part(`drum-rim-${i}`, ngon(R + 30 * S, 10).extrude(45 * S).rotateY(90).translate((i ? 1 : -1) * L / 2 - (i ? 0 : 45 * S), 0, zc).color(steel));
block('frame-base', 1500 * S, 750 * S, 90 * S, 0, 0, 0, steel);
post('tilt-pivot', 95 * S, 520 * S, 0, -R - 100 * S, 220 * S, accent);
a.part('drive-box', box(400 * S, 360 * S, 380 * S, true).translate(0, R + 130 * S, 250 * S).color(steel));
a.part('handwheel', ringZ(160 * S, 24 * S, 370 * S, R + 140 * S, 500 * S, accent).rotateX(90));

return a.model();
