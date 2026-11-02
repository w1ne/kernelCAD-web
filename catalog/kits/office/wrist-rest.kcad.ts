meta({
  name: 'wrist-rest',
  license: 'CC0-1.0',
  title: 'Keyboard wrist rest',
  description: 'Low padded wrist rest with a non-slip base and stitched top band. Knobs: compact or standard format, cushion, base and seam colours.',
  tags: ['wrist rest', 'keyboard wrist rest', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 100,
});

const body = param('body', '#5a7585', { label: 'Body' });
const accent = param('accent', '#3d454a', { label: 'Accent' });
const detail = param('detail', '#b3a88e', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('wrist-rest');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('non-slip-base', 0, 0, 0, 315, 70, 8, accent);
addBox('cushion', 0, 0, 8, 315, 66, 24, body);
addBox('seam-front', 0, -32, 32, 300, 3, 2, detail);
addBox('end-cap-left', -151, 0, 8, 10, 60, 22, body);
addBox('end-cap-right', 151, 0, 8, 10, 60, 22, body);

return office.model();
