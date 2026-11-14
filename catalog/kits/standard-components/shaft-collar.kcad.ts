// Illustrative set-screw shaft collar: axial shaft bore, radial access bore, and separate slotted grub screw.
meta({
  name: 'shaft-collar',
  license: 'CC0-1.0',
  title: 'Shaft collar',
  description: 'Illustrative CC0 low-poly set-screw shaft collar with an open axial shaft bore, radial access passage and separate simplified slotted grub screw contacting the shaft opening. Three uniform scene scales and display colors only. No screw threads, tolerances, holding torque or vendor fit data; not manufacturing CAD.',
  tags: ['shaft collar', 'set collar', 'shaft hardware', 'rotating shaft'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 300,
});

const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Model size' });
const steel = param('steel', '#85929a', { label: 'Steel' });
const zinc = param('zinc', '#cbd1d5', { label: 'Zinc-plated steel' });
presets({
  dark: { steel: '#3e484e', zinc: '#929da3' },
  brass: { steel: '#646f75', zinc: '#c29a5c' },
  weathered: { steel: '#665b4d', zinc: '#a19682' }
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const a = assembly('shaft-collar');
// The radial screw axis enters through the -Y wall and reaches the axial Ø20 bore.
// This is an actual passage, not a colored boss embedded in a solid collar.
const axialBore = cylinder(14*s,10*s,16).translate(0,0,-s);
const radialBore = cylinder(13*s,2.1*s,12).rotateX(-90).translate(0,-21*s,6*s);
const ring = cylinder(12*s,19*s,16).subtract(axialBore).subtract(radialBore);
a.part('collar-ring', ring.color(steel));
// Distinct body: headless set screw with an exposed screwdriver slot. It reaches
// the Ø20 bore wall at y=-10 mm; helix/thread and torque are intentionally omitted.
const slot = box(3*s,2.7*s,0.75*s).translate(-1.5*s,-22*s,5.625*s);
const screw = cylinder(11*s,1.9*s,12).rotateX(-90).translate(0,-21*s,6*s).subtract(slot);
a.part('radial-set-screw', screw.color(zinc));
return a.model();
