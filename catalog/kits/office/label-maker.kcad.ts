meta({
  name: 'label-maker',
  license: 'CC0-1.0',
  title: 'Desktop label maker',
  description: 'Small desktop label maker with display, keypad, feed opening and tape cartridge. Knobs: compact or standard format, case, display and key colours.',
  tags: ['label maker', 'label printer', 'office equipment', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 240,
});

const body = param('body', '#3e535f', { label: 'Body' });
const accent = param('accent', '#d5d8d6', { label: 'Accent' });
const detail = param('detail', '#c66c50', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('label-maker');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('case', 0, 0, 0, 165, 110, 32, body);
addBox('display', -38, 22, 32, 58, 24, 4, accent);
addBox('tape-exit', 24, -53, 0, 78, 5, 10, detail);
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 4; col++) {
    addBox(`key-${row}-${col}`, -47 + col * 31, -8 + row * 24, 32, 20, 16, 4, accent);
  }
}
addCylinder('tape-roll', 10, 18, 61, 26, 0, detail);
addBox('feed-guide', 20, -49, 10, 84, 4, 3, accent);

return office.model();
