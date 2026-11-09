// Equipment foot plate with a raised locating boss, selectable perimeter hole
// pattern, and optional socket-head mounting bolts.
meta({
  name: 'base-mounting-plate',
  license: 'CC0-1.0',
  title: 'Base mounting plate',
  description: 'Square equipment foot plate with a raised locating boss, four- or eight-hole mounting pattern and optional socket-head bolts. Knobs: size, hole pattern, fasteners, steel, brass and zinc finishes.',
  tags: ['mounting plate', 'base plate', 'machine foot', 'flange'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 1300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const holePattern = param('holePattern', '4-corner', { choices: ['4-corner', '8-perimeter'], label: 'Hole pattern' });
const fasteners = param('fasteners', 'open', { choices: ['open', 'installed'], label: 'Mounting bolts' });
const steel = param('steel', '#85929a', { label: 'Plate steel' });
const brass = param('brass', '#b28a4d', { label: 'Locating boss brass' });
const zinc = param('zinc', '#b7c0c5', { label: 'Bolt zinc plating' });
presets({
  dark: { steel: '#3e484e', brass: '#725938', zinc: '#727c81' },
  brass: { steel: '#646f75', brass: '#c0944d', zinc: '#9c845e' },
  weathered: { steel: '#665b4d', brass: '#8c734d', zinc: '#756d62' },
  galvanized: { steel: '#aab3b8', brass: '#ad8954', zinc: '#c4cbd0' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const corners: [number, number][] = [[-22, -22], [22, -22], [22, 22], [-22, 22]];
const perimeter: [number, number][] = [...corners, [0, -22], [22, 0], [0, 22], [-22, 0]];
const holes = holePattern.value === '8-perimeter' ? perimeter : corners;
const a = assembly('base-mounting-plate');

let plate = block(-30 * s, -30 * s, 0, 60 * s, 60 * s, 5 * s);
for (const [x, y] of holes) {
  plate = plate.subtract(cylinder(7 * s, 3.4 * s, 12).translate(x * s, y * s, -s));
}
a.part('plate', plate.color(steel));
a.part('locating-boss', cylinder(12 * s, 9 * s, 12).translate(0, 0, 5 * s).color(brass));

if (fasteners.value === 'installed') {
  for (const [index, [x, y]] of holes.entries()) {
    const bolt = cylinder(5.2 * s, 2.45 * s, 10)
      .union(cylinder(2.1 * s, 4.1 * s, 6).translate(0, 0, 5 * s));
    a.part(`mounting-bolt-${index + 1}`, bolt.translate(x * s, y * s, 0).color(zinc));
  }
}

return a.model();
