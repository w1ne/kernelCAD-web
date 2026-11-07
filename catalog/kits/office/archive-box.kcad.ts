// Archive box: Desktop document archive box with a lift-off lid, hand slots and front label. Material controls: paperboard, cover stock, label ink.

meta({
  name: 'archive-box',
  license: 'CC0-1.0',
  title: 'Archive box',
  description: "Desktop document archive box with a lift-off lid, hand slots and front label. Controls: paperboard, cover stock, label ink.",
  tags: ['archive box', 'document box', 'storage', 'office', 'stationery'],
  kit: 'office',
  category: 'prop',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 150,
});

const paperboard = param('paperboard', '#b8945b', { label: 'Paperboard' });
const coverStock = param('coverStock', '#e7ddc7', { label: 'Cover stock' });
const ink = param('ink', '#427895', { label: 'Label ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { paperboard: '#b8945b', coverStock: '#e7ddc7', ink: '#427895' },
  classroom: { paperboard: '#6d9a72', coverStock: '#ef9852', ink: '#4e5caa' },
});

const office = assembly('archive-box');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof paperboard | typeof coverStock | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === paperboard) office.part(name, partShape.color(paperboard));
  else if (colour === coverStock) office.part(name, partShape.color(coverStock));
  else office.part(name, partShape.color(ink));
};

addBox('box-paperboard', 0, 0, 0, 260, 350, 210, paperboard);
addBox('front-label', 0, -177, 125, 105, 4, 32, coverStock);
addBox('label-mark', 0, -180, 130, 50, 3, 6, ink);
addBox('lid', 0, 0, 210, 276, 366, 18, coverStock);
addBox('lid-grip', 0, -184, 210, 58, 8, 14, paperboard);

return office.model();
