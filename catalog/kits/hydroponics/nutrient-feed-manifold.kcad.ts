// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nutrient-feed-manifold",
  license: 'CC0-1.0',
  title: "Nutrient feed manifold",
  description: "Header rail with five evenly spaced outlet branches, isolation blocks and a vertical supply riser. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b837d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nutrient-feed-manifold");
p.part("header", b(0,0,520,1800,70,70).color(color));
p.part("mount-rail", b(0,0,0,1850,65,55).color(color));
p.part("support-left", b(-800,0,55,55,55,465).color(color));
p.part("support-right", b(800,0,55,55,55,465).color(color));
p.part("valve-left", b(-570,-35,440,100,100,120).color(color));
p.part("valve-mid-left", b(-285,-35,440,100,100,120).color(color));
p.part("valve-mid", b(0,-35,440,100,100,120).color(color));
p.part("valve-mid-right", b(285,-35,440,100,100,120).color(color));
p.part("valve-right", b(570,-35,440,100,100,120).color(color));
p.part("branch-1", c(-570,0,100,410,24,10).color(color));
p.part("branch-2", c(-285,0,100,410,24,10).color(color));
p.part("branch-3", c(0,0,100,410,24,10).color(color));
p.part("branch-4", c(285,0,100,410,24,10).color(color));
p.part("branch-5", c(570,0,100,410,24,10).color(color));
p.part("supply-riser", c(-880,0,55,510,32,10).color(color));

return p.model();
