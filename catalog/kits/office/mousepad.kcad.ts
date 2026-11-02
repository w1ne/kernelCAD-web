meta({
  name: 'mousepad',
  license: 'CC0-1.0',
  title: 'Mouse pad',
  description: 'Flat desktop mouse pad with stitched border, wrist-side edge and subtle center mark. Knobs: compact or standard format, pad, stitching and accent colours.',
  tags: ['mouse pad', 'mouse mat', 'desk accessory', 'office', 'workstation'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const body = param('body', '#34414a', { label: 'Body' });
const accent = param('accent', '#657b89', { label: 'Accent' });
const detail = param('detail', '#d1c69e', { label: 'Detail' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  clean: { body: '#e8e7df', accent: '#66829a', detail: '#454b50' },
  warm: { body: '#c8a875', accent: '#557581', detail: '#493c34' },
});

const office = assembly('mousepad');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof body) => {
  office.part(name, box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k).color(colour));
};

addBox('pad', 0, 0, 0, 230, 195, 5, body);
addBox('north-stitch', 0, 93, 5, 218, 2, 2, accent);
addBox('south-stitch', 0, -93, 5, 218, 2, 2, accent);
addBox('east-stitch', 113, 0, 5, 2, 184, 2, accent);
addBox('west-stitch', -113, 0, 5, 2, 184, 2, accent);
addBox('center-mark', 0, 0, 5, 22, 3, 2, detail);

return office.model();
