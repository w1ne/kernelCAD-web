meta({
  name: 'material-handling-hopper',
  license: 'CC0-1.0',
  title: 'Mobile material hopper',
  description: 'Forkliftable bulk-material hopper with sloped discharge body, four corner feet and a bottom gate. Knobs: size, body, steel and safety colours.',
  tags: ['material hopper', 'forklift hopper', 'bulk handling', 'factory', 'industrial'],
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
const a = assembly('material-handling-hopper');
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1200 * S, D = 1050 * S, H = 1000 * S;
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();
a.part('hopper-body', rect(W, D).loft(rect(W * 0.42, D * 0.42), { spacing: H, ruled: true }).translate(0, 0, 240 * S).color(body));
block('top-rim', W + 90 * S, D + 90 * S, 75 * S, 0, 0, H + 180 * S, steel);
block('gate', 260 * S, 260 * S, 85 * S, 0, 0, 180 * S, accent);
for (const x of [-W * 0.36, W * 0.36]) for (const y of [-D * 0.36, D * 0.36]) block(`fork-foot-${x < 0 ? 'a' : 'b'}-${y < 0 ? 'a' : 'b'}`, 140 * S, 120 * S, 260 * S, x, y, 0, steel);

return a.model();
