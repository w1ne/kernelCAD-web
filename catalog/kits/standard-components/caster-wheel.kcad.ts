// Distinctive geometry: Single low-poly swivel caster with a fork, mounting plate and centered wheel
meta({
  name: 'caster-wheel',
  license: 'CC0-1.0',
  title: 'Caster wheel',
  description: 'Single low-poly swivel caster with a fork, mounting plate and centered wheel Knobs: model size, steel, zinc-plated steel, rubber.',
  tags: ['caster wheel', 'swivel caster', 'wheel', 'mobile base'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 520,
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
a.part('swivel-stem',cylinder(10*s,6*s,16).translate(0,0,36*s).color(zinc));
a.part('fork-left',block(-8*s,-12*s,18*s,16*s,4*s,27*s).color(steel));
a.part('fork-right',block(-8*s,8*s,18*s,16*s,4*s,27*s).color(steel));
let tire=cylinder(13*s,16*s,24).rotateX(90).translate(0,6.5*s,16*s);
tire=tire.subtract(cylinder(15*s,5*s,24).rotateX(90).translate(0,7.5*s,16*s));
a.part('rubber-tire',tire.color(rubber));
a.part('wheel-hub',cylinder(13*s,5*s,20).rotateX(90).translate(0,6.5*s,16*s).color(zinc));
return a.model();
