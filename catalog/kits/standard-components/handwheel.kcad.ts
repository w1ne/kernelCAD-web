// Distinctive geometry: Three-spoke handwheel with a raised center hub and a clear circular rim
meta({
  name: 'handwheel',
  license: 'CC0-1.0',
  title: 'Handwheel',
  description: 'Illustrative CC0 three-spoke handwheel with a raised solid hub envelope and an open circular rim. Not manufacturer-grade CAD: no shaft bore, keyway, tolerances or torque rating. Knobs change model size and colors only.',
  tags: ['handwheel', 'control wheel', 'valve wheel', 'machine control'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 340,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const castIron = param('castIron', '#68747a', { label: 'Cast iron' });
const brass = param('brass', '#b28a4d', { label: 'Brass' });
presets({
  dark: { steel: '#3e484e', castIron: '#3b4246', brass: '#725938' },
  brass: { steel: '#646f75', castIron: '#69645b', brass: '#c0944d' },
  weathered: { steel: '#665b4d', castIron: '#4d4b46', brass: '#8c734d' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('handwheel');
const rim=cylinder(6*s,30*s,16).subtract(cylinder(8*s,24*s,16).translate(0,0,-s));
a.part('rim',rim.rotateX(90).translate(0,3*s,30*s).color(castIron));
a.part('hub',cylinder(18*s,10*s,12).rotateX(90).translate(0,9*s,30*s).color(brass));
// Each radial spoke overlaps the hub and rim; centered full-width bars make six spokes.
for (const angle of [0,120,240]) a.part(`spoke-${angle}`,box(22*s,5*s,5*s,true).translate(16*s,0,0).rotateY(angle).translate(0,0,30*s).color(steel));
return a.model();
