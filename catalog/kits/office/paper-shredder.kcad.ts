meta({
  name: 'paper-shredder',
  license: 'CC0-1.0',
  title: 'Paper shredder',
  description: 'Compact office paper shredder with a feed slot, control panel and removable collection bin. Knobs: compact or standard format, housing, controls and panel colours.',
  tags: ['paper shredder', 'office machine', 'document disposal', 'office', 'equipment'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const body = param('body', '#c4c7c5', { label: 'Body' });
const accent = param('accent', '#41494e', { label: 'Accent' });
const detail = param('detail', '#677d88', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('paper-shredder');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};
const addCylinder = (name: string, h: number, r: number, x: number, y: number, z: number, colour: typeof body) => {
  office.part(name, cylinder(h * k, r * k).translate(x * k, y * k, z * k).color(colour));
};

addBox('cabinet', 0, 0, 0, 300, 250, 420, body);
addBox('top-cap', 0, 0, 420, 312, 260, 18, accent);
addBox('feed-slot', 0, 0, 438, 190, 7, 3, detail);
addBox('control-panel', 107, -72, 360, 62, 28, 44, accent);
addBox('power-button', 107, -87, 380, 20, 4, 12, detail);
addBox('bin-window', 0, -127, 230, 118, 4, 92, detail);
addBox('left-foot', -118, 0, 0, 24, 220, 16, accent);
addBox('right-foot', 118, 0, 0, 24, 220, 16, accent);

return office.model();
