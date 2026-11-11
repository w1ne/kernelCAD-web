// Distinctive geometry: Two jaw hubs with a visible flexible center spider between the shaft bores
meta({
  name: 'jaw-coupling',
  license: 'CC0-1.0',
  title: 'Jaw coupling',
  description: 'Illustrative CC0 low-poly jaw coupling: two bored hubs with three offset jaws each, and a separate six-lobed elastomer spider seated in the six alternating spaces. Not a rated torque/fatigue or vendor manufacturing model. Controls: model size, steel and polymer colors.',
  tags: ['jaw coupling', 'flexible coupling', 'shaft connector', 'rotary'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 520,
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
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('jaw-coupling');
// Two interleaved three-jaw hubs and a six-lobed elastomer spider.
// The jaws are visible geometry; the assembly remains an illustrative prop.
const hubA=cylinder(12*s,18*s,20).subtract(cylinder(14*s,7*s,20).translate(0,0,-s));
const hubB=cylinder(12*s,18*s,20).subtract(cylinder(14*s,7*s,20).translate(0,0,-s));
a.part('drive-hub',hubA.color(steel));
a.part('driven-hub',hubB.translate(0,0,24*s).color(steel));
for (let i=0;i<3;i++) {
  const angle=120*i;
  a.part(`drive-jaw-${i}`,block(10*s,-3*s,12*s,9*s,6*s,8*s).rotateZ(angle).color(steel));
  a.part(`driven-jaw-${i}`,block(10*s,-3*s,16*s,9*s,6*s,8*s).rotateZ(angle+60).color(steel));
}
a.part('elastomer-core',cylinder(7*s,8*s,16).translate(0,0,15*s).color(polymer));
// Metal jaws are centred at 0, 60, 120 ... degrees. The spider fingers must
// occupy the intervening spaces, not coincide with and penetrate those jaws.
for (let i=0;i<6;i++) {
  a.part(`spider-lobe-${i}`,block(7*s,-1.4*s,15*s,8*s,2.8*s,7*s).rotateZ(i*60+30).color(polymer));
}
return a.model();
