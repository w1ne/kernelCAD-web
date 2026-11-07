// Distinctive geometry: Polymer end cap with locating ribs seated in a grooved aluminum extrusion profile.
meta({
  name: 't-slot-end-cap',
  license: 'CC0-1.0',
  title: 'T-slot end cap',
  description: 'Polymer end cap with locating ribs seated in a short grooved aluminum extrusion profile. Knobs: model size, aluminum, engineering polymer.',
  tags: ['t-slot end cap', 'profile cap', 'extrusion accessory', 'frame'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const aluminum = param('aluminum', '#aebac0', { label: 'Aluminum' });
const polymer = param('polymer', '#e46b3c', { label: 'Engineering polymer' });
presets({
  dark: { aluminum: '#586970', polymer: '#244956' },
  brass: { aluminum: '#aab8bc', polymer: '#1d5364' },
  weathered: { aluminum: '#788177', polymer: '#96734f' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h).translate(x, y, z);
const a = assembly('t-slot-end-cap');
a.part('cap',block(-22*s,-22*s,0,44*s,44*s,5*s).color(polymer));
for (const x of [-14,14]) for (const y of [-14,14]) a.part(`rib-${x}-${y}`,block((x-2)*s,(y-2)*s,5*s,4*s,4*s,9*s).color(polymer));
let extrusion=block(-22*s,-22*s,14*s,44*s,44*s,40*s).subtract(block(-16*s,-16*s,13*s,32*s,32*s,42*s));
extrusion=extrusion.subtract(block(-3*s,20*s,13*s,6*s,2*s,42*s));
extrusion=extrusion.subtract(block(-3*s,-22*s,13*s,6*s,2*s,42*s));
extrusion=extrusion.subtract(block(20*s,-3*s,13*s,2*s,6*s,42*s));
extrusion=extrusion.subtract(block(-22*s,-3*s,13*s,2*s,6*s,42*s));
a.part('aluminum-profile',extrusion.color(aluminum));
return a.model();
