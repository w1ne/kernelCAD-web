meta({
  name: 'machine-foundation-skid',
  license: 'CC0-1.0',
  title: 'Machine foundation skid',
  description: 'Heavy machine foundation skid with perimeter rails, crossmembers, anchor pads and a lifting lug set. Knobs: size, frame, steel and safety colours.',
  tags: ['machine skid', 'equipment base', 'factory', 'industrial', 'foundation'],
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
const a = assembly('machine-foundation-skid');
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const L = 2200 * S, W = 1300 * S, H = 160 * S;
block('deck', L, W, 70 * S, 0, 0, 0, body);
for (const y of [-W / 2, W / 2]) block(`side-rail-${y < 0 ? 'a' : 'b'}`, L, 115 * S, H, 0, y, 70 * S, steel);
for (let i = 0; i < 4; i++) block(`crossmember-${i}`, 95 * S, W, 120 * S, (i - 1.5) * L * 0.22, 0, 20 * S, steel);
for (let i = 0; i < 4; i++) block(`anchor-pad-${i}`, 220 * S, 220 * S, 32 * S, (i % 2 ? 1 : -1) * L * 0.42, (i < 2 ? 1 : -1) * W * 0.42, H, accent);

return a.model();
