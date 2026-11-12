// Distinctive geometry: Single low-poly swivel caster with a fork, mounting plate and centered wheel
meta({
  name: 'caster-wheel',
  license: 'CC0-1.0',
  title: 'Caster wheel',
  description: 'Illustrative CC0 low-poly scene prop; not a vendor manufacturing or load-rated model. Single low-poly swivel caster with a fork, mounting plate and centered wheel Knobs: model size, steel, zinc-plated steel, rubber.',
  tags: ['caster wheel', 'swivel caster', 'wheel', 'mobile base'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 800,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
const rubber = param('rubber', '#353a3d', { label: 'Rubber' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3', rubber: '#242729' },
  brass: { steel: '#646f75', zinc: '#c29a5c', rubber: '#2a2d2f' },
  weathered: { steel: '#665b4d', zinc: '#a19682', rubber: '#3b3935' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('caster-wheel');
// A single-wheel swivel caster: a horizontal mounting plate, vertical swivel,
// two parallel fork cheeks and a wheel whose axle is horizontal.
let mount=block(-25*s,-19*s,46*s,50*s,38*s,5*s);
for (const x of [-18,18]) for (const y of [-12,12])
  mount=mount.subtract(cylinder(7*s,2.5*s,12).translate(x*s,y*s,45*s));
a.part('mounting-plate',mount.color(steel));
// One connected fork casting: crown joins both cheeks and the swivel stem.
// The axle passes through real clearance bores, not floating above the cheeks.
let fork=block(-8*s,-12*s,12*s,16*s,4*s,24*s)
  .union(block(-8*s,8*s,12*s,16*s,4*s,24*s))
  .union(block(-8*s,-12*s,34*s,16*s,24*s,4*s))
  .union(cylinder(10*s,6*s,16).translate(0,0,36*s));
fork=fork.subtract(cylinder(28*s,3.2*s,20).rotateX(90).translate(0,14*s,16*s));
a.part('swivel-fork',fork.color(steel));
a.part('wheel-axle',cylinder(26*s,3*s,20).rotateX(90).translate(0,13*s,16*s).color(zinc));
let tire=cylinder(13*s,16*s,24).rotateX(90).translate(0,6.5*s,16*s);
tire=tire.subtract(cylinder(15*s,5*s,24).rotateX(90).translate(0,7.5*s,16*s));
a.part('rubber-tire',tire.color(rubber));
const hub=cylinder(13*s,5*s,20).subtract(cylinder(15*s,3.2*s,20).translate(0,0,-s));
a.part('wheel-hub',hub.rotateX(90).translate(0,6.5*s,16*s).color(zinc));
return a.model();
