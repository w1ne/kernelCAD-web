meta({
  name: 'caster-wheel',
  license: 'CC0-1.0',
  title: 'Caster wheel',
  description: 'Single low-poly swivel caster with a fork, mounting plate and centered wheel. Knobs: model size and finish colour.',
  tags: ['caster wheel', 'swivel caster', 'wheel', 'mobile base'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 380,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('caster-wheel');
a.part('mount',block(-24*s,-16*s,42*s,48*s,32*s,5*s).color(finish));
a.part('stem',cylinder(18*s,5*s,10).translate(0,0,24*s).color(finish));
a.part('fork-left-front',block(-22*s,-11*s,8*s,5*s,4*s,36*s).color(finish));
a.part('fork-right-front',block(17*s,-11*s,8*s,5*s,4*s,36*s).color(finish));
a.part('fork-left-back',block(-22*s,7*s,8*s,5*s,4*s,36*s).color(finish));
a.part('fork-right-back',block(17*s,7*s,8*s,5*s,4*s,36*s).color(finish));
let wheel=cylinder(14*s,22*s,14).rotateX(90).translate(0,7*s,22*s);
wheel=wheel.subtract(cylinder(16*s,9*s,10).rotateX(90).translate(0,8*s,22*s));
a.part('wheel',wheel.color(finish));
return a.model();
