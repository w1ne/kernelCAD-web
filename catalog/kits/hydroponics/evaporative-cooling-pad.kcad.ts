// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "evaporative-cooling-pad",
  license: 'CC0-1.0',
  title: "Evaporative cooling pad",
  description: "Cooling wall section with a framed media panel, top water header and lower collection trough. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71877b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("evaporative-cooling-pad");
p.part("pad-core", b(0,0,180,1400,150,1500).color(color));
p.part("frame-left", b(-740,0,100,70,190,1670).color(color));
p.part("frame-right", b(740,0,100,70,190,1670).color(color));
p.part("frame-top", b(0,0,1640,1500,190,70).color(color));
p.part("sump-trough", b(0,0,0,1550,240,180).color(color));
p.part("front-grille", b(0,-105,300,1280,30,1260).color(color));
p.part("side-support-left", b(-650,0,0,60,300,100).color(color));
p.part("side-support-right", b(650,0,0,60,300,100).color(color));
p.part("water-header", c(0,0,1665,65,42,10).color(color));
p.part("inlet-riser", c(650,0,180,1460,25,10).color(color));
p.part("drain-outlet", c(0,-135,40,180,30,10).color(color));

return p.model();
