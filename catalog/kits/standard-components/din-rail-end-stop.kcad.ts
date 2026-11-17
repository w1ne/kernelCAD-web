// SPDX-License-Identifier: CC0-1.0
// Low-poly TH35 end-stop scene prop. Approximate clip and screw; no rated fit.
// The rail runs along X; the stop face is normal to X. Construction Z=0
// is the lip plane. Export shifts 1.4 mm up to put clip bottom on base Z=0.
meta({
  name: 'din-rail-end-stop',
  license: 'CC0-1.0',
  title: 'DIN rail end stop (TH35 illustrative)',
  description: 'CC0 low-poly scene prop of a TH35 DIN rail end stop. A two-sided under-lip clip, through-bored clamp housing, separate adjustable screw with a recessed slot, and transverse stop face are modeled. Sized around the illustrative rail cross-section at matching scale, but not a verified clip design, load-rated part, or certified IEC 60715 accessory. Scale changes all dimensions; finish colors are visual only.',
  tags: ['din rail end stop', 'TH35', 'rail stop', 'electrical cabinet', 'clip', 'CC0', 'scene prop'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});
const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative model scale' });
const bodyFinish = param('steel', '#879299', { label: 'Body finish appearance' });
const screwFinish = param('zinc', '#cbd1d5', { label: 'Screw finish appearance' });
presets({
  dark: { steel: '#424c52', zinc: '#a0a8ad' },
  brass: { steel: '#626d73', zinc: '#b99b69' },
  weathered: { steel: '#6b685f', zinc: '#9d9a90' },
});
const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
const block = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w*s, d*s, h*s).translate(x*s, y*s, z*s);
const cyl = (r: number, h: number, z: number, sides=16) => cylinder(h*s,r*s,sides).translate(-5*s,0,z*s);

// A TH35 rail has 35 mm opposed outer lips at Z=0..1.5 mm and a raised crown
// at Z=5.9..7.5 mm. Leave the underside open for the crown and skirts.
let housing = block(-12,-20.8,8.5,24,41.6,3.5);
// Two side retainers descend *outside* the rail lip envelope.
housing = housing.union(block(-12,-20.8,-1.4,24,1.6,10.1));
housing = housing.union(block(-12,19.2,-1.4,24,1.6,10.1));
// Hooks reach under both lips; top ends at Z=-0.3, clear of the lip at Z>=0.
housing = housing.union(block(-12,-20.8,-1.4,24,5.5,1.1));
housing = housing.union(block(-12,15.3,-1.4,24,5.5,1.1));
// The stop arrests translation along X. Support the tightening screw behind it.
housing = housing.union(block(9,-18,11.5,4,36,18.5));
housing = housing.union(block(-9,-6,11.5,8,12,6));
// A real bore through the clamp block/saddle, not a painted circle or boss.
housing = housing.subtract(cyl(2.25,12,7.0));

// Distinct adjustable screw: shank within the clearance bore and a slotted head.
let screw = cyl(1.9,10.2,7.4).union(cyl(3.6,2.4,17.4));
screw = screw.subtract(block(-8.9,-0.75,18.9,7.8,1.5,1.2));
const a = assembly('din-rail-end-stop');
a.part('under-lip-clip-and-stop-face',housing.translate(0,0,1.4*s).color(bodyFinish));
a.part('separate-slotted-clamping-screw',screw.translate(0,0,1.4*s).color(screwFinish));
return a.model();
