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
  triangleBudget: 380,
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
a.part('mount',block(-24*s,-16*s,42*s,48*s,32*s,5*s).color(steel));
a.part('stem',cylinder(18*s,5*s,10).translate(0,0,24*s).color(zinc));
a.part('fork-left-front',block(-22*s,-11*s,8*s,5*s,4*s,36*s).color(steel));
a.part('fork-right-front',block(17*s,-11*s,8*s,5*s,4*s,36*s).color(steel));
a.part('fork-left-back',block(-22*s,7*s,8*s,5*s,4*s,36*s).color(steel));
a.part('fork-right-back',block(17*s,7*s,8*s,5*s,4*s,36*s).color(steel));
let wheel=cylinder(14*s,22*s,14).rotateX(90).translate(0,7*s,22*s);
wheel=wheel.subtract(cylinder(16*s,9*s,10).rotateX(90).translate(0,8*s,22*s));
a.part('wheel',wheel.color(rubber));
return a.model();
