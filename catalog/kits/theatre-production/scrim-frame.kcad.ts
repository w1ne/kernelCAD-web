// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "scrim-frame",
  license: 'CC0-1.0',
  title: "Scrim frame",
  description: "Freestanding scenic scrim panel with a rectangular support frame and weighted stabilizer feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7a7770", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("scrim-frame");
p.part("scrim", b(0,0,0,1700,55,1850).color(color));
p.part("top-frame", b(0,0,1850,1820,85,85).color(color));
p.part("bottom-frame", b(0,0,0,1820,85,85).color(color));
p.part("left-frame", b(-860,0,0,85,70,1850).color(color));
p.part("right-frame", b(860,0,0,85,70,1850).color(color));
p.part("mid-rail", b(0,0,900,1700,55,50).color(color));
p.part("foot-left", b(-650,-100,0,130,400,90).color(color));
p.part("foot-right", b(650,-100,0,130,400,90).color(color));
p.part("foot-pin-left", c(-650,-100,0,84,44,10).color(color));
p.part("foot-pin-right", c(650,-100,0,84,44,10).color(color));

return p.model();
