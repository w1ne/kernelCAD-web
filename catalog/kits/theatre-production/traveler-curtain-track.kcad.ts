// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "traveler-curtain-track",
  license: 'CC0-1.0',
  title: "Traveler curtain track",
  description: "Straight curtain track with end stops, suspended support points and paired traveler panels. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d6e79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("traveler-curtain-track");
p.part("track", b(0,0,1900,2400,70,65).color(color));
p.part("support-left", b(-850,0,1955,60,90,230).color(color));
p.part("support-center", b(0,0,1955,60,90,230).color(color));
p.part("support-right", b(850,0,1955,60,90,230).color(color));
p.part("left-curtain", b(-620,0,0,1100,50,1840).color(color));
p.part("right-curtain", b(620,0,0,1100,50,1840).color(color));
p.part("bottom-hem-left", b(-620,0,0,1100,70,80).color(color));
p.part("bottom-hem-right", b(620,0,0,1100,70,80).color(color));
p.part("carrier-left", c(-250,0,1860,70,36,10).color(color));
p.part("carrier-center", c(0,0,1860,70,36,10).color(color));
p.part("carrier-right", c(250,0,1860,70,36,10).color(color));

return p.model();
