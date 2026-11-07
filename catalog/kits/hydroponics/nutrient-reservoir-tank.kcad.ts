// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nutrient-reservoir-tank",
  license: 'CC0-1.0',
  title: "Nutrient reservoir tank",
  description: "Lidded solution reservoir with access hatch, level sight column and low drain fitting. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b8376", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nutrient-reservoir-tank");
p.part("tank-shell", b(0,0,0,1250,950,940).color(color));
p.part("lid", b(0,0,940,1280,980,80).color(color));
p.part("hatch-ring", b(-380,-270,1020,340,300,40).color(color));
p.part("hatch-cover", b(-380,-270,1060,270,230,38).color(color));
p.part("left-band", b(-635,0,150,35,920,760).color(color));
p.part("right-band", b(635,0,150,35,920,760).color(color));
p.part("sight-column", c(470,-500,180,620,35,10).color(color));
p.part("drain-fitting", c(0,-510,60,180,48,10).color(color));
p.part("vent-cap", c(450,400,1020,100,38,10).color(color));

return p.model();
