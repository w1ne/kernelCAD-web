// A compact linear guide assembly: a drilled aluminum rail supports a steel raceway and a movable carriage with a relieved underside, top mounting wells and polymer end wipers.
meta({
  name: 'linear-guide-rail',
  license: 'CC0-1.0',
  title: 'Linear guide rail',
  description: 'Linear guide with a drilled aluminum rail, raised steel raceway and a position-selectable carriage with top mounting wells and polymer wipers. Knobs: rail size, carriage position, aluminum, steel and engineering polymer.',
  tags: ['linear guide', 'guide rail', 'motion rail', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 760,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const carriagePosition = param('carriagePosition', 'center', { choices: ['left', 'center', 'right'], label: 'Carriage position' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
const polymer = param('polymer', '#e46b3c', { label: 'Polymer end wipers' });
presets({
  dark: { steel: '#3e484e', aluminum: '#586970', polymer: '#244956' },
  highVisibility: { steel: '#434b50', aluminum: '#bbc5c8', polymer: '#e97832' },
  weathered: { steel: '#665b4d', aluminum: '#788177', polymer: '#4b4942' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const carriageX = carriagePosition.value === 'left' ? -32*s : carriagePosition.value === 'right' ? 32*s : 0;
const a = assembly('linear-guide-rail');
let base=block(-60*s,-16*s,0,120*s,32*s,7*s);
for (const x of [-45,-15,15,45]) base=base.subtract(cylinder(9*s,3*s,10).translate(x*s,0,-s));
a.part('base',base.color(aluminum));
a.part('raceway',block(-60*s,-7*s,7*s,120*s,14*s,8*s).color(steel));
let carriage = block(carriageX-20*s,-15*s,10*s,40*s,30*s,18*s);
carriage = carriage.subtract(block(carriageX-21*s,-8*s,9*s,42*s,16*s,13*s));
for (const x of [-12,12]) for (const y of [-9,9]) {
  carriage = carriage.subtract(cylinder(7*s,2.4*s,10).translate(carriageX+x*s,y*s,22*s));
}
a.part('carriage',carriage.color(steel));
a.part('left-race-contact',block(carriageX-18*s,6.5*s,14*s,36*s,2*s,2*s).color(steel));
a.part('right-race-contact',block(carriageX-18*s,-8.5*s,14*s,36*s,2*s,2*s).color(steel));
a.part('left-end-wiper',block(carriageX-21.5*s,-15*s,13*s,2*s,30*s,14*s).color(polymer));
a.part('right-end-wiper',block(carriageX+19.5*s,-15*s,13*s,2*s,30*s,14*s).color(polymer));
return a.model();
