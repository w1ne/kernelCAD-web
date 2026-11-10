// Two bored steel hubs drive across a three-lobe elastomer spider; offset hub jaws interleave around the flexible insert.
meta({
  name: 'jaw-coupling',
  license: 'CC0-1.0',
  title: 'Jaw coupling',
  description: 'Two bored steel hubs with offset driving jaws around a three-lobe elastomer spider and visible set-screw heads. Knobs: model size, hub steel, engineering polymer and set-screw steel.',
  tags: ['jaw coupling', 'flexible coupling', 'shaft connector', 'rotary'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 640,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
const setScrewSteel = param('setScrewSteel', '#343a3e', { label: 'Set-screw steel' });
presets({
  dark: { steel: '#3e484e', polymer: '#244956', setScrewSteel: '#171b1d' },
  highTorque: { steel: '#aeb8be', polymer: '#d74631', setScrewSteel: '#343a3e' },
  weathered: { steel: '#665b4d', polymer: '#96734f', setScrewSteel: '#34312d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('jaw-coupling');
const jawHub = (bottom: number, phase: number, jawsDown = false) => {
  let hub = cylinder(18*s, 16*s, 14).translate(0, 0, bottom)
    .subtract(cylinder(20*s, 8*s, 12).translate(0, 0, bottom - s));
  for (let i = 0; i < 3; i++) {
    const angle = phase + (120 * i * Math.PI) / 180;
    const jawZ = jawsDown ? bottom - 2*s : bottom + 14*s;
    const jaw = box(9*s, 7*s, 6*s).translate(9*s, -3.5*s, jawZ).rotateZ((angle * 180) / Math.PI);
    hub = hub.union(jaw);
  }
  return hub;
};
let spider = cylinder(12*s, 7*s, 12).translate(0, 0, 15*s);
for (let i = 0; i < 3; i++) {
  const angle = ((60 + 120 * i) * Math.PI) / 180;
  const lobe = box(11*s, 7*s, 12*s).translate(4*s, -3.5*s, 15*s).rotateZ((angle * 180) / Math.PI);
  // The lobes overlap the center web so the elastomer insert remains one body.
  spider = spider.union(lobe);
}
a.part('lower-jaw-hub', jawHub(0, 0).color(steel));
a.part('elastomer-spider', spider.color(polymer));
a.part('upper-jaw-hub', jawHub(24*s, Math.PI / 3, true).color(steel));
a.part('lower-set-screw', cylinder(3*s, 2.4*s, 8).rotateX(90).translate(0, -15*s, 9*s).color(setScrewSteel));
a.part('upper-set-screw', cylinder(3*s, 2.4*s, 8).rotateX(90).translate(0, -15*s, 33*s).color(setScrewSteel));
return a.model();
