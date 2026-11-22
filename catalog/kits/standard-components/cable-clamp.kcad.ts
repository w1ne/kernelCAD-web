// A low-poly cable saddle, with usable mounting holes and a cable passage.
// The continuous steel frame supports the arch; the rubber liner is separate.
meta({
  name: 'cable-clamp',
  license: 'CC0-1.0',
  title: 'Cable clamp',
  description: 'Illustrative CC0 low-poly cable saddle: two open mounting holes, a connected steel arch and a separate rubber liner around the cable passage. Not a load-rated, toleranced or vendor manufacturing model. Knobs: model size and display colors.',
  tags: ['cable clamp', 'wire clamp', 'strain relief', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 420,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { steel: '#3e484e', rubber: '#242729' },
  brass: { steel: '#646f75', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('cable-clamp');
// Plate sits below a straight-through cable path (along Y). Both mounting
// holes pass through the plate and remain clear of the arched cable seat.
let frame = block(-24*s, -17*s, 0, 48*s, 34*s, 3*s);
for (const x of [-18, 18]) {
  const hole = cylinder(5*s, 3.1*s, 16).translate(x*s, 0, -s);
  frame = frame.subtract(hole);
}
// Upper annulus is only the TOP half of the cable saddle. Side supports
// extend down to the plate: no floating rubber ring or solid blocked bore.
const upperClip = block(-13*s, -10.5*s, 10.5*s, 26*s, 21*s, 12*s);
const arch = cylinder(19*s, 11*s, 32)
  .subtract(cylinder(21*s, 8.5*s, 32).translate(0, 0, -s))
  .rotateX(90).translate(0, 9.5*s, 10.5*s).intersect(upperClip);
frame = frame.union(block(-11*s, -9.5*s, 3*s, 2.7*s, 19*s, 8*s))
  .union(block(8.3*s, -9.5*s, 3*s, 2.7*s, 19*s, 8*s))
  .union(arch);
a.part('connected-steel-frame', frame.color(steel));
const liner = cylinder(19*s, 8.5*s, 32)
  .subtract(cylinder(21*s, 7.2*s, 32).translate(0, 0, -s))
  .rotateX(90).translate(0, 9.5*s, 10.5*s).intersect(upperClip);
a.part('separate-rubber-liner', liner.color(rubber));
return a.model();
