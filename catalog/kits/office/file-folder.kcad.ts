meta({
  name: 'file-folder',
  license: 'CC0-1.0',
  title: 'File folder',
  description: 'Folded desktop file folder with a raised tab and visible paper edge. Knobs: compact or standard format, folder, paper and tab colours.',
  tags: ['file folder', 'folder', 'document', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 140,
});

const body = param('body', '#c9ad73', { label: 'Body' });
const accent = param('accent', '#eee9dc', { label: 'Accent' });
const detail = param('detail', '#587b9e', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('file-folder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('folder-back', 0, 0, 0, 235, 315, 8, body);
addBox('folder-front', 0, -12, 8, 235, 290, 5, body);
addBox('paper-edge', 0, 5, 13, 218, 270, 5, accent);
addBox('raised-tab', 66, 145, 8, 72, 28, 7, body);
addBox('tab-label', 66, 144, 15, 42, 3, 12, detail);

return office.model();
