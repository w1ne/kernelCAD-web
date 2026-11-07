// Envelope stack: Small stack of office envelopes with visible flap panels and paper edges. Material controls: kraft paper, envelope paper, printed ink.

meta({
  name: 'envelope-stack',
  license: 'CC0-1.0',
  title: 'Envelope stack',
  description: "Small stack of office envelopes with visible flap panels and paper edges. Controls: kraft paper, envelope paper, printed ink.",
  tags: ['envelopes', 'mail', 'paper', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 120,
});

const kraftPaper = param('kraftPaper', '#c8a96d', { label: 'Kraft paper' });
const paper = param('paper', '#f2eee4', { label: 'Envelope paper' });
const ink = param('ink', '#4b6681', { label: 'Printed ink' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { kraftPaper: '#c8a96d', paper: '#f2eee4', ink: '#4b6681' },
  classroom: { kraftPaper: '#75a06d', paper: '#f0df91', ink: '#b54f47' },
});

const office = assembly('envelope-stack');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof kraftPaper | typeof paper | typeof ink) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === kraftPaper) office.part(name, partShape.color(kraftPaper));
  else if (colour === paper) office.part(name, partShape.color(paper));
  else office.part(name, partShape.color(ink));
};

addBox('bottom-envelope', 0, 0, 0, 220, 115, 7, paper);
addBox('middle-envelope', 0, 0, 7, 220, 115, 7, kraftPaper);
addBox('top-envelope', 0, 0, 14, 220, 115, 7, paper);
addBox('flap-panel', 0, 41, 21, 180, 5, 4, kraftPaper);
addBox('address-block', -43, -15, 21, 72, 36, 2, ink);

return office.model();
