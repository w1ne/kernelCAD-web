// CC0 low-poly welded-style bracket; the plates are separate illustrative members, not a load-rated weldment.
meta({
  name: 'gusset-bracket',
  license: 'CC0-1.0',
  title: 'Gusset bracket',
  description: 'Illustrative right-angle gusset bracket with touching wall, toe and diagonal web, plus four through mounting holes. Not a load-rated fabrication drawing. Knobs: model size, steel, stainless steel.',
  tags: ['gusset bracket', 'shelf support', 'mounting bracket', 'plate'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const stainless = param('stainless', '#b8c1c6', { label: 'Stainless steel' });
presets({
  dark: { steel: '#3e484e', stainless: '#7d8a91' },
  brass: { steel: '#646f75', stainless: '#b38b52' },
  weathered: { steel: '#665b4d', stainless: '#8b8275' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('gusset-bracket');

// Y = -3*s is the common wall/toe contact plane; no floating plate or web.
// All three bodies remain separate to represent the welded-style construction.
let wall = block(-28*s, -3*s, 0, 56*s, 6*s, 44*s);
let toe = block(-28*s, -43*s, 0, 56*s, 40*s, 6*s);
for (const x of [-18, 18]) {
  // Clearance bores go all the way through both plates (not surface decals).
  wall = wall.subtract(cylinder(8*s, 3.2*s, 20).rotateX(90).translate(x*s, 4*s, 31*s));
  toe = toe.subtract(cylinder(8*s, 3.2*s, 20).translate(x*s, -30*s, -1*s));
}
// Polygon in the YZ plane after rotation: bottom contacts toe at Z=6*s;
// rear edge contacts wall at Y=-3*s. The web occupies X=+-2.5*s.
const web = extrudePolygon([[-41*s, 6*s], [-3*s, 6*s], [-3*s, 38*s]], 5*s)
  .rotateX(90).rotateZ(90).translate(-2.5*s, 0, 0);
a.part('wall-plate', wall.color(steel));
a.part('horizontal-toe', toe.color(steel));
a.part('diagonal-web', web.color(stainless));
return a.model();
