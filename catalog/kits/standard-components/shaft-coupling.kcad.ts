// A rigid shaft coupling sleeve: two bored steel hubs meet at a bronze center band, with selectable radial set-screw or split-clamp retention.
meta({
  name: 'shaft-coupling',
  license: 'CC0-1.0',
  title: 'Shaft coupling sleeve',
  description: 'Rigid shaft coupling with two through-bored steel hubs, a bronze center band and selectable set-screw or split-clamp retention. Knobs: size, retention style, steel, bronze and zinc-plated set screws.',
  tags: ['shaft coupling', 'shaft sleeve', 'rotary coupling', 'machine'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 620,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const retention = param('retention', 'setScrews', { choices: ['setScrews', 'splitClamp'], label: 'Shaft retention' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const bronze = param('bronze', '#98714c', { label: 'Bronze' });
const setScrewSteel = param('setScrewSteel', '#cbd1d5', { label: 'Zinc-plated set screws' });
presets({
  dark: { steel: '#3e484e', bronze: '#684d37', setScrewSteel: '#929da3' },
  brass: { steel: '#646f75', bronze: '#b0804d', setScrewSteel: '#c29a5c' },
  weathered: { steel: '#665b4d', bronze: '#6e583f', setScrewSteel: '#a19682' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const makeHub = (z: number, midZ: number) => {
  let hub = cylinder(15*s,17*s,14).subtract(cylinder(17*s,8*s,12).translate(0,0,-s));
  if (retention.value === 'splitClamp') {
    hub = hub.subtract(block(-s,-19*s,-s,2*s,12*s,17*s));
  } else {
    hub = hub.subtract(cylinder(12*s,2.2*s,8).rotateX(90).translate(0,-7*s,midZ));
  }
  return hub.translate(0,0,z);
};
const a = assembly('shaft-coupling');
a.part('left-hub',makeHub(0,7.5*s).color(steel));
a.part('center-band',cylinder(8*s,19*s,14).subtract(cylinder(10*s,8*s,12).translate(0,0,-s)).translate(0,0,15*s).color(bronze));
a.part('right-hub',makeHub(23*s,7.5*s).color(steel));
if (retention.value === 'setScrews') {
  for (const [name, z] of [['left',7.5], ['right',30.5]] as const) {
    a.part(`${name}-set-screw`,cylinder(5*s,2.6*s,8).rotateX(90).translate(0,-13*s,z*s).color(setScrewSteel));
  }
} else {
  for (const [name, z] of [['left',7.5], ['right',30.5]] as const) {
    a.part(`${name}-clamp-bolt`,cylinder(16*s,1.8*s,8).rotateY(90).translate(-8*s,-15*s,z*s).color(setScrewSteel));
    a.part(`${name}-clamp-head`,cylinder(3*s,3*s,6).rotateY(90).translate(-11*s,-15*s,z*s).color(setScrewSteel));
  }
}
return a.model();
