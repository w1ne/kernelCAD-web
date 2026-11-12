// Distinctive geometry: Compact external corner bracket for joining two perpendicular framing profiles
meta({
  name: 't-slot-angle-bracket',
  license: 'CC0-1.0',
  title: 'T-slot angle bracket',
  description: 'Illustrative CC0 low-poly scene prop; not a vendor manufacturing or load-rated model. Compact external corner bracket for joining two perpendicular framing profiles Knobs: model size, steel, aluminum.',
  tags: ['t-slot', 'angle bracket', 'frame connector', 'extrusion'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 600,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
presets({
  dark: { steel: '#3e484e', aluminum: '#586970' },
  brass: { steel: '#646f75', aluminum: '#aab8bc' },
  weathered: { steel: '#665b4d', aluminum: '#788177' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('t-slot-angle-bracket');
let base=block(-24*s,-20*s,0,48*s,40*s,5*s);
let upright=block(-24*s,15*s,5*s,48*s,5*s,34*s);
for (const x of [-13,13]) {
  base=base.subtract(cylinder(7*s,3*s,12).translate(x*s,-6*s,-s));
  upright=upright.subtract(cylinder(7*s,3*s,12).rotateX(90).translate(x*s,21*s,24*s));
}
a.part('horizontal-mount',base.color(aluminum));
a.part('vertical-mount',upright.color(aluminum));
// Each triangular web lies in a YZ plane and spans from the horizontal
// foot to the upright. Keep it outside the mounting-hole columns.
const web=extrudePolygon([[-18*s,5*s],[15*s,5*s],[15*s,35*s]],4*s)
  .rotateX(90).rotateZ(90);
a.part('web-a',web.translate(-24*s,0,0).color(steel));
a.part('web-b',web.translate(20*s,0,0).color(steel));
return a.model();
