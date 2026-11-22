// Distinctive geometry: Block-shaped linear carriage with a recessed underside channel and raised top pad
meta({
  name: 'linear-guide-carriage',
  license: 'CC0-1.0',
  title: 'Linear guide carriage',
  description: 'Block-shaped linear carriage with a recessed underside channel and raised top pad Knobs: model size, steel, cast iron.',
  tags: ['linear guide carriage', 'rail carriage', 'motion block', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
presets({
  dark: { steel: '#3e484e', castIron: '#3b4246' },
  brass: { steel: '#646f75', castIron: '#69645b' },
  weathered: { steel: '#665b4d', castIron: '#4d4b46' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('linear-guide-carriage');
const shoe=block(-22*s,-20*s,0,44*s,40*s,20*s).subtract(block(-18*s,-8*s,-s,36*s,16*s,13*s));
a.part('shoe',shoe.color(castIron));
a.part('top-pad',block(-16*s,-14*s,20*s,32*s,28*s,5*s).color(steel));
return a.model();
