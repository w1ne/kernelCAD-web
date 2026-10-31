// Original kernelCAD low-poly water tile: a 2 m x 2 m grass tile with a
// recessed faceted pond, a sandy bank step and a flat opaque water surface.
// Pieces nest without overlapping so every face is a visible surface.

meta({
  name: 'water-tile',
  title: 'Water tile (pond)',
  description: 'Square 2 m grass tile with a sunken faceted pond or stream, sandy bank and flat water surface. Knobs: pond shape, pond size, grass, bank, water and dirt colours.',
  tags: ['tile', 'water', 'pond', 'pool', 'lake', 'terrain', 'grid', 'nature'],
  kit: 'nature',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'water', 'meadow', 'forest'],
  triangleBudget: 220,
});

const shape = param('shape', 'round', { choices: ['round', 'square', 'stream'], label: 'Pond shape' });
const sizeM = param('sizeM', '1.4', { choices: ['1', '1.4', '1.7'], label: 'Pond width (m)' });
const grass = param('grass', '#6aa443', { label: 'Grass' });
const bank = param('bank', '#d8c08a', { label: 'Bank' });
const water = param('water', '#3f8fc4', { label: 'Water' });
const dirt = param('dirt', '#7a5636', { label: 'Dirt edge' });

presets({
  swamp: { water: '#4f6b3a', bank: '#6b5a3a', grass: '#5c7d3a' },
  icy: { water: '#cfe6f2', grass: '#eef3f6', bank: '#b9c4cc' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.7;
const floorZ = 50;
const bankTop = t - 25;
const waterTop = t - 55;
const R = (Number(sizeM.value) * 1000) / 2;

// Pond outline: irregular nonagon, chamfered square, or a stream running edge to edge.
const outline = (r: number): [number, number][] => {
  if (shape.value === 'square') {
    const c = r * 0.25;
    return [[r, -r + c], [r, r - c], [r - c, r], [-r + c, r], [-r, r - c], [-r, -r + c], [-r + c, -r], [r - c, -r]];
  }
  if (shape.value === 'stream') {
    const e = S / 2;
    return [[e, -r * 0.7], [e, r * 0.7], [r * 0.3, r * 0.8], [-r * 0.3, r * 0.65], [-e, r * 0.7], [-e, -r * 0.7], [-r * 0.3, -r * 0.8], [r * 0.3, -r * 0.65]];
  }
  const pts: [number, number][] = [];
  for (let k = 0; k < 9; k++) {
    const a = 0.2 + (2 * Math.PI * k) / 9;
    const rr = r * (0.86 + 0.14 * Math.sin(k * 2.9));
    pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  return pts;
};
const prism = (pts: [number, number][], z0: number, z1: number) => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);
const outer = outline(R);
const inner = outline(R).map(([x, y]) => [x * 0.8, y * (shape.value === 'stream' ? 0.75 : 0.8)] as [number, number]);
if (shape.value === 'stream') {
  // keep the channel running to the tile edges
  inner[0][0] = S / 2; inner[1][0] = S / 2; inner[4][0] = -S / 2; inner[5][0] = -S / 2;
}

const tile = assembly('water-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).subtract(prism(outer, floorZ, t + 10)).color(dirt));
tile.part('grass', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).subtract(prism(outer, skirtH - 10, t + 10)).color(grass));
tile.part('bank', prism(outer, floorZ, bankTop).subtract(prism(inner, floorZ - 10, t)).color(bank));
tile.part('water', prism(inner, floorZ, waterTop).color(water));

return tile.model();
