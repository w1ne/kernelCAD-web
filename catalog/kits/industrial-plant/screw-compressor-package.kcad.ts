meta({
  name: 'screw-compressor-package',
  license: 'CC0-1.0',
  title: 'Rotary screw compressor package',
  description: 'Sound-attenuated screw compressor package with service cabinet, control screen, louvres and tank base. Knobs: size, casing, steel and safety colours.',
  tags: ['screw compressor', 'air plant', 'factory', 'industrial'],
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
const a = assembly('screw-compressor-package');
const block = (name: string, w: number, d: number, h: number, x: number, y: number, z: number, c = steel) => a.part(name, box(w, d, h, true).translate(x, y, z + h / 2).color(c));


const W = 1400 * S, D = 950 * S, H = 1150 * S;
block('base', W + 100 * S, D + 100 * S, 100 * S, 0, 0, 0, steel);
block('cabinet', W, D, H, 0, 0, 100 * S, body);
block('door', W * 0.42, 36 * S, H * 0.72, -W * 0.22, -D / 2 - 20 * S, 220 * S, steel);
for (let i = 0; i < 6; i++) block(`louver-${i}`, W * 0.32, 20 * S, 32 * S, W * 0.24, -D / 2 - 25 * S, 260 * S + i * 105 * S, accent);
block('control-screen', 220 * S, 48 * S, 170 * S, -W * 0.22, -D / 2 - 44 * S, H + 650 * S, accent);

return a.model();
