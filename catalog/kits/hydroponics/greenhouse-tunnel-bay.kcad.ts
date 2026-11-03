// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-tunnel-bay",
  license: 'CC0-1.0',
  title: "Greenhouse tunnel bay",
  description: "A compact hoop-house bay with perimeter posts, ridge beam, door frame and vent curb. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#728c79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-tunnel-bay");
p.part("base-rail-left", b(-750,0,0,50,3000,80).color(color));
p.part("base-rail-right", b(750,0,0,50,3000,80).color(color));
p.part("front-post-left", b(-750,-1450,80,55,55,2200).color(color));
p.part("front-post-right", b(750,-1450,80,55,55,2200).color(color));
p.part("rear-post-left", b(-750,1450,80,55,55,2200).color(color));
p.part("rear-post-right", b(750,1450,80,55,55,2200).color(color));
p.part("ridge-beam", b(0,0,2950,65,3000,65).color(color));
p.part("front-door-header", b(0,-1450,2140,1500,55,60).color(color));
p.part("vent-curb", b(0,500,2220,1250,360,120).color(color));
p.part("ridge-support", c(0,0,80,2840,40,10).color(color));

return p.model();
