meta({
  name: 'industrial-furnace',
  license: 'CC0-1.0',
  title: 'Industrial heat-treatment furnace',
  description: 'Box furnace with insulated body, front loading door, status lights, raised base and extraction stack. Knobs: size, body, steel and safety colours.',
  tags: ['industrial furnace', 'heat treatment', 'factory', 'industrial', 'kiln'],
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
const a = assembly('industrial-furnace');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1350 * S, D = 1150 * S, H = 1500 * S;
block('base', W + 100 * S, D + 100 * S, 180 * S, 0, 0, 0, steel);
block('furnace-body', W, D, H, 0, 0, 180 * S, body);
block('door-frame', W * 0.66, 65 * S, H * 0.68, 0, -D / 2 - 35 * S, 360 * S, steel);
block('hot-door', W * 0.54, 36 * S, H * 0.56, 0, -D / 2 - 80 * S, 450 * S, accent);
for (let i = 0; i < 3; i++) a.part(`status-${i}`, ngon(28 * S, 8).extrude(22 * S).rotateX(90).translate((i - 1) * 100 * S, -D / 2 - 105 * S, H + 120 * S).color(i === 1 ? accent : steel));
a.part('exhaust-stack', ngon(95 * S, 8).extrude(650 * S).translate(W * 0.32, 0, H + 180 * S).color(steel));

return a.model();
