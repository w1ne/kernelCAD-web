meta({
  name: 'cooling-water-pump-skid',
  license: 'CC0-1.0',
  title: 'Cooling water pump skid',
  description: 'Dual cooling-water pump skid with two motor-pump sets, common base, suction header and discharge manifold. Knobs: size, housing, steel and safety colours.',
  tags: ['pump skid', 'cooling water', 'dual pump', 'factory', 'industrial'],
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
const a = assembly('cooling-water-pump-skid');
const ngon = (r: number, n: number) => { let p = path().moveTo(r, 0); for (let i = 1; i < n; i++) { const t = 2 * Math.PI * i / n; p = p.lineTo(r * Math.cos(t), r * Math.sin(t)); } return p.close(); };
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));
const beamX = (name: string, length: number, r: number, x: number, y: number, z: number, c = steel) => a.part(name, ngon(r, 8).extrude(length).rotateY(90).translate(x, y, z).color(c));


const W = 1700 * S;
block('base', W, 900 * S, 90 * S, 0, 0, 0, steel);
for (let i = 0; i < 2; i++) {
  const x = (i ? 1 : -1) * 420 * S;
  a.part(`motor-${i}`, ngon(145 * S, 8).extrude(520 * S).rotateY(90).translate(x - 260 * S, 0, 400 * S).color(body));
  a.part(`pump-${i}`, ngon(210 * S, 8).extrude(170 * S).rotateY(90).translate(x + 240 * S, 0, 410 * S).color(accent));
  block(`foot-${i}`, 760 * S, 540 * S, 120 * S, x, 0, 90 * S, steel);
}
beamX('suction-header', W * 0.88, 66 * S, -W * 0.44, -310 * S, 410 * S, steel);
beamX('discharge-header', W * 0.88, 66 * S, -W * 0.44, 310 * S, 600 * S, accent);

return a.model();
