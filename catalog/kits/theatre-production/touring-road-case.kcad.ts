// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "touring-road-case",
  license: 'CC0-1.0',
  title: "Touring road case",
  description: "Flight case with reinforced corners, recessed pull handles, latches and low roller feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#68717b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("touring-road-case");
p.part("case-shell", b(0,0,0,900,650,950).color(color));
p.part("lid", b(0,0,950,920,670,90).color(color));
p.part("front-rail", b(0,-330,80,860,35,75).color(color));
p.part("back-rail", b(0,330,80,860,35,75).color(color));
p.part("left-corner", b(-440,0,0,55,620,1000).color(color));
p.part("right-corner", b(440,0,0,55,620,1000).color(color));
p.part("handle-left", b(-460,-150,430,60,60,180).color(color));
p.part("handle-right", b(460,-150,430,60,60,180).color(color));
p.part("latch-left", b(-260,-350,780,90,45,100).color(color));
p.part("latch-right", b(260,-350,780,90,45,100).color(color));
p.part("wheel-left", c(-340,250,0,130,58,10).color(color));
p.part("wheel-right", c(340,250,0,130,58,10).color(color));

return p.model();
