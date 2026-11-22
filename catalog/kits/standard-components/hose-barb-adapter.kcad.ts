// SPDX-License-Identifier: CC0-1.0
// Low-poly, single-piece stepped hose barb fitting. Not a certified pressure fitting.
meta({
  name: 'hose-barb-adapter',
  license: 'CC0-1.0',
  title: 'Hose barb adapter (illustrative)',
  description: 'Illustrative CC0 one-piece hose-barb adapter with three real tapered retention lips, a continuous axial bore, and six wrench flats. Nominal envelope only, not manufacturer-grade CAD: hose-ID compatibility, insertion/retention forces, pressure rating, thread form, machining tolerance and material grade are not specified. Size and appearance colors are visual controls, not a parts standard.',
  tags: ['hose barb', 'hose adapter', 'barbed fitting', 'plumbing', 'CC0', 'scene prop'],
  kit: 'standard-components',
  category: 'attachment',
  origin: 'base',
  compat: ['mechanical', 'industrial', 'workshop', 'assembly'],
  triangleBudget: 500,
});
const size = param('size', 'standard', { choices: ['compact', 'standard', 'large'], label: 'Illustrative model size' });
const metalColor = param('brass', '#b28a4d', { label: 'Metal appearance color' });
presets({
  dark: { brass: '#725938' },
  brass: { brass: '#c0944d' },
  weathered: { brass: '#8c734d' },
});

const s = size.value === 'compact' ? 0.75 : size.value === 'large' ? 1.25 : 1;
// A lathed spigot cross-section with three genuine conical barbs: gradual ramps
// towards the wrench end, then abrupt retaining shoulders at z=7/14/21 mm.
// It retains a 12 mm axial fluid passage throughout the 36 mm nominal length.
const outer: [number,number][] = [
  [9.5,0], [10,2], [10,4], [12,7], [10,7.4],
  [10,11], [12,14], [10,14.4],
  [10,18], [12,21], [10,21.4], [10,28],
];
let section = path().moveTo(6*s,0);
for(const [r,z] of outer) section=section.lineTo(r*s,z*s);
section=section.lineTo(6*s,28*s).close();
const spigot=section.revolve();
// True six-flat wrench prism, AF28, not a square decoration.
const circumradius = 28/Math.sqrt(3);
const hex = Array.from({length:6},(_,i)=>{
  const angle=(i*60+30)*Math.PI/180;
  return [circumradius*s*Math.cos(angle),circumradius*s*Math.sin(angle)] as [number,number];
});
const wrench = extrudePolygon(hex,8.5*s)
  .subtract(cylinder(9.5*s,6*s,16).translate(0,0,-0.5*s))
  .translate(0,0,27.5*s);
const fitting = spigot.union(wrench).color(metalColor);
const a = assembly('hose-barb-adapter');
a.part('single-piece-bored-barbed-fitting',fitting);
return a.model();
