meta({
  name: 'highlighter',
  license: 'CC0-1.0',
  title: 'Highlighter',
  description: 'Broad chisel-tip highlighter with a removable cap and contrasting end plug. Knobs: compact or standard format, barrel, cap and tip colours.',
  tags: ['highlighter', 'marker pen', 'office', 'stationery', 'writing tool'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const body = param('body', '#e5d448', { label: 'Body' });
const accent = param('accent', '#393f44', { label: 'Accent' });
const detail = param('detail', '#f4edbc', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('highlighter');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('barrel', 0, 0, 0, 112, 24, 22, body);
addBox('cap', -48, 0, 2, 28, 28, 26, accent);
addBox('cap-clip', -38, 16, 17, 45, 4, 5, accent);
addBox('chisel-tip', 55, 0, 4, 12, 18, 12, detail);
addBox('end-plug', -61, 0, 4, 8, 18, 14, detail);

return office.model();
