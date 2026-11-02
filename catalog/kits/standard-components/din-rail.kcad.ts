meta({
  name: 'din-rail',
  license: 'CC0-1.0',
  title: 'DIN rail',
  description: 'Short symmetric top-hat rail profile with a flat web and raised edge lips. Knobs: model size and finish colour.',
  tags: ['din rail', 'mounting rail', 'control cabinet', 'electrical'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const finish = param('finish', '#9aa2a8', { label: 'Finish' });
presets({
  dark: { finish: '#3b3e43' },
  brass: { finish: '#b58a43' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('din-rail');
a.part('web',block(-55*s,-18*s,0,110*s,36*s,4*s).color(finish));
a.part('left-lip',block(-55*s,-18*s,4*s,110*s,5*s,8*s).color(finish));
a.part('right-lip',block(-55*s,13*s,4*s,110*s,5*s,8*s).color(finish));
a.part('ridge',block(-55*s,-6*s,4*s,110*s,12*s,4*s).color(finish));
return a.model();
