// Original kernelCAD low-poly frozen pond tile: a 2 m x 2 m snowy tile with a
// sunken pond of pale ice inside a stony bank, a few dark cracks across the
// ice and an optional ice-fishing hole with broken chunks. Edges sit at the
// 0.2 m tile height, like the nature water tile.

meta({
  name: 'frozen-pond-tile',
  license: 'CC0-1.0',
  title: 'Frozen pond tile',
  description: 'Square 2 m winter tile with an ice-covered pond in a stony bank, cracks across the ice and an optional fishing hole with ice chunks. Knobs: pond width, fishing hole, snow, ice, crack, bank and water colours.',
  tags: ['tile', 'ice', 'frozen', 'pond', 'lake', 'winter', 'snow', 'skating', 'terrain', 'grid'],
  kit: 'terrain',
  category: 'terrain',
  origin: 'base',
  compat: ['outdoor', 'grid-2m', 'winter', 'mountain'],
  triangleBudget: 400,
});

const sizeM = param('sizeM', '1.5', { choices: ['1.2', '1.5', '1.8'], label: 'Pond width (m)' });
const hole = param('hole', 'yes', { choices: ['yes', 'no'], label: 'Fishing hole' });
const snow = param('snow', '#eef3f7', { label: 'Snow' });
const ice = param('ice', '#bfe2f2', { label: 'Ice' });
const crack = param('crack', '#7fb3cf', { label: 'Cracks' });
const bank = param('bank', '#8d8f93', { label: 'Stony bank' });
const water = param('water', '#2d5f7a', { label: 'Open water' });
const dirt = param('dirt', '#5d4b3d', { label: 'Frozen dirt edge' });

presets({
  night: { snow: '#cdd6ea', ice: '#8fb0d8', crack: '#5a7bb0', water: '#1c2f4a' },
  greenice: { ice: '#bfe8d8', crack: '#6fb39a' },
});

const S = 2000;
const t = 200;
const skirtH = t * 0.6;
const iceTop = t - 45;
const R = (Number(sizeM.value) * 1000) / 2;

const outline = (r: number): [number, number][] => {
  const pts: [number, number][] = [];
  for (let k = 0; k < 10; k++) {
    const a = 0.25 + (2 * Math.PI * k) / 10;
    const rr = r * (0.86 + 0.14 * Math.sin(k * 2.9));
    pts.push([rr * Math.cos(a), rr * 0.9 * Math.sin(a)]);
  }
  return pts;
};
const prism = (pts: [number, number][], z0: number, z1: number) => extrudePolygon(pts, z1 - z0).translate(0, 0, z0);
const outer = outline(R);
const inner = outline(R * 0.86);

const tile = assembly('frozen-pond-tile');
tile.part('dirt', box(S, S, skirtH, true).translate(0, 0, skirtH / 2).subtract(prism(outer, 60, t + 10)).color(dirt));
tile.part('snow', box(S, S, t - skirtH, true).translate(0, 0, (t + skirtH) / 2).subtract(prism(outer, skirtH - 10, t + 10)).color(snow));
tile.part('bank', prism(outer, 60, t - 20).subtract(prism(inner, 50, t)).color(bank));
const hx = R * 0.35;
const hy = -R * 0.2;
const holeR = 130;
const holePts: [number, number][] = [];
for (let k = 0; k < 7; k++) holePts.push([hx + holeR * Math.cos(k * 0.9), hy + holeR * Math.sin(k * 0.9)]);
let iceShape = prism(inner, 60, iceTop);
if (hole.value === 'yes') iceShape = iceShape.subtract(prism(holePts, iceTop - 30, iceTop + 10));
tile.part('ice', iceShape.color(ice));
if (hole.value === 'yes') {
  tile.part('open-water', prism(holePts.map(([x, y]) => [hx + (x - hx) * 0.98, hy + (y - hy) * 0.98] as [number, number]), iceTop - 35, iceTop - 25).color(water));
  // Broken ice chunks lying beside the hole.
  [[hx + 230, hy + 60, 0.4], [hx + 160, hy - 200, 1.3], [hx - 90, hy - 230, 2.2]].forEach(([x, y, rot], i) => {
    tile.part(`chunk-${i + 1}`, extrudePolygon([[-70, -40], [80, -55], [60, 50], [-50, 45]], 30).rotateZ(rot * 57).translate(x, y, iceTop - 2).color(ice));
  });
}
// Cracks: thin dark slivers just proud of the ice.
const cracks: [number, number, number, number][] = [[-R * 0.6, R * 0.1, 0.45 * R, 25], [-R * 0.2, R * 0.45, 0.4 * R, -40], [-R * 0.35, -R * 0.4, 0.35 * R, 70]];
cracks.forEach(([x, y, len, ang], i) => {
  tile.part(`crack-${i + 1}`, extrudePolygon([[0, -10], [len * 0.5, -4], [len, 0], [len * 0.5, 6]], 3).rotateZ(ang).translate(x, y, iceTop - 1).color(crack));
});

return tile.model();
