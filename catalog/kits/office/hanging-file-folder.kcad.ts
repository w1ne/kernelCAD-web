meta({
  name: 'hanging-file-folder',
  license: 'CC0-1.0',
  title: 'Hanging file folder',
  description: 'Hanging document folder with a broad tab and two end rails for a filing drawer. Knobs: compact or standard format, folder, paper and rail colours.',
  tags: ['hanging folder', 'hanging file', 'file folder', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#c39e62', { label: 'Body' });
const accent = param('accent', '#e9e6dc', { label: 'Accent' });
const detail = param('detail', '#6a7580', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('hanging-file-folder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('folder-body', 0, 0, 0, 250, 330, 8, body);
addBox('paper-stack', 0, 15, 8, 228, 275, 12, accent);
addBox('tab', 82, 151, 8, 76, 28, 8, body);
addBox('left-hanger', -117, 0, 4, 9, 350, 8, detail);
addBox('right-hanger', 117, 0, 4, 9, 350, 8, detail);
addBox('tab-label', 82, 149, 16, 42, 3, 12, accent);

return office.model();
