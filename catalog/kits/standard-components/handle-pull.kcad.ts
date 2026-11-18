// Distinctive geometry: Raised U-shaped cabinet pull with two mounting feet and a straight grip bar
meta({
  name: 'handle-pull',
  license: 'CC0-1.0',
  title: 'Handle pull',
  description: 'Raised U-shaped cabinet pull with two mounting feet and a straight grip bar Knobs: model size, steel, engineering polymer.',
  tags: ['pull handle', 'cabinet handle', 'grab handle', 'hardware'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 320,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
presets({
  dark: { steel: '#3e484e', polymer: '#244956' },
  brass: { steel: '#646f75', polymer: '#1d5364' },
  weathered: { steel: '#665b4d', polymer: '#96734f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('handle-pull');
a.part('foot-left',cylinder(4*s,8*s,12).translate(-22*s,0,0).color(steel));
a.part('foot-right',cylinder(4*s,8*s,12).translate(22*s,0,0).color(steel));
a.part('post-left',cylinder(28*s,4*s,10).translate(-22*s,0,4*s).color(steel));
a.part('post-right',cylinder(28*s,4*s,10).translate(22*s,0,4*s).color(steel));
a.part('grip',cylinder(44*s,5*s,12).rotateY(90).translate(-22*s,0,30*s).color(polymer));
return a.model();
