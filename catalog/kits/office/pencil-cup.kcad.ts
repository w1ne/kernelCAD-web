// Pencil cup: Open desktop cup with a stable base and a small set of upright writing tools. Material controls: ceramic cup, pencil wood, graphite.

meta({
  name: 'pencil-cup',
  license: 'CC0-1.0',
  title: 'Pencil cup',
  description: "Open desktop cup with a stable base and a small set of upright writing tools. Controls: ceramic cup, pencil wood, graphite.",
  tags: ['pencil cup', 'pen holder', 'desk organizer', 'office', 'stationery'],
  kit: 'office',
  category: 'item',
  origin: 'base',
  compat: ['office', 'interior', 'desktop'],
  triangleBudget: 180,
});

const ceramic = param('ceramic', '#546f82', { label: 'Ceramic cup' });
const wood = param('wood', '#b69263', { label: 'Pencil wood' });
const graphite = param('graphite', '#484e50', { label: 'Graphite' });
const format = param('format', 'standard', { choices: ['compact', 'standard'], label: 'Format' });
const k = format.value === 'compact' ? 0.8 : 1;

presets({
  professional: { ceramic: '#546f82', wood: '#b69263', graphite: '#484e50' },
  classroom: { ceramic: '#d3634d', wood: '#d6ad4d', graphite: '#587f56' },
});

const office = assembly('pencil-cup');

const addBox = (name: string, x: number, y: number, z: number, w: number, d: number, h: number, colour: typeof ceramic | typeof wood | typeof graphite) => {
  const partShape = box(w * k, d * k, h * k, true).translate(x * k, y * k, (z + h / 2) * k);
  if (colour === ceramic) office.part(name, partShape.color(ceramic));
  else if (colour === wood) office.part(name, partShape.color(wood));
  else office.part(name, partShape.color(graphite));
};

addBox('cup-floor', 0, 0, 0, 72, 72, 8, graphite);
addBox('front-wall', 0, -33, 8, 72, 6, 74, ceramic);
addBox('back-wall', 0, 33, 8, 72, 6, 74, ceramic);
addBox('left-wall', -33, 0, 8, 6, 72, 74, ceramic);
addBox('right-wall', 33, 0, 8, 6, 72, 74, ceramic);
addBox('pencil-one', -18, 2, 14, 8, 8, 110, wood);
addBox('pencil-two', 3, -5, 14, 8, 8, 122, graphite);
addBox('pencil-three', 20, 7, 14, 8, 8, 98, wood);
addBox('rim-front', 0, -33, 78, 72, 6, 5, graphite);
addBox('rim-back', 0, 33, 78, 72, 6, 5, graphite);
addBox('rim-left', -33, 0, 78, 6, 72, 5, graphite);
addBox('rim-right', 33, 0, 78, 6, 72, 5, graphite);

return office.model();
