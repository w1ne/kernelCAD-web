// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "motorized-chain-hoist",
  license: 'CC0-1.0',
  title: "Motorized chain hoist",
  description: "Compact overhead hoist body with a motor cover, suspension bail, chain drop and lower hook block. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b727b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("motorized-chain-hoist");
p.part("hoist-case", b(0,0,850,430,360,370).color(color));
p.part("motor-cover", b(-240,0,950,170,310,240).color(color));
p.part("control-cover", b(210,-185,980,140,55,130).color(color));
p.part("suspension-bail-left", b(-140,0,1220,60,70,220).color(color));
p.part("suspension-bail-right", b(140,0,1220,60,70,220).color(color));
p.part("bail-top", b(0,0,1420,340,70,55).color(color));
p.part("chain", c(0,0,185,650,34,10).color(color));
p.part("hook-block", c(0,0,0,185,70,10).color(color));
p.part("hook-tip", c(55,0,0,100,32,10).color(color));
p.part("chain-wheel", c(0,0,1160,115,120,10).color(color));

return p.model();
