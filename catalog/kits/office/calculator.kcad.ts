meta({
  name: 'calculator',
  license: 'CC0-1.0',
  title: 'Desktop calculator',
  description: 'Desktop calculator with segmented display, solar strip and a four-by-three keypad. Knobs: compact or standard format, case, display and key colours.',
  tags: ['calculator', 'desktop calculator', 'office supplies', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 250,
});

const body = param('body', '#41494e', { label: 'Body' });
const accent = param('accent', '#b6c5c4', { label: 'Accent' });
const detail = param('detail', '#d6d7d1', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('calculator');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('case', 0, 0, 0, 115, 180, 15, body);
addBox('display', 0, 57, 15, 82, 28, 4, accent);
addBox('solar-panel', 0, 28, 15, 56, 10, 3, detail);
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    addBox(`key-${row}-${col}`, -33 + col * 33, 2 - row * 28, 15, 23, 20, 5, row === 0 ? detail : accent);
  }
}
addBox('zero-key', 0, -76, 15, 55, 20, 5, detail);

return office.model();
