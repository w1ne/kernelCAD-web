// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "vertical-grow-tower",
  license: 'CC0-1.0',
  title: "Vertical grow tower",
  description: "Stacked hydroponic planting collars around a central feed column on a weighted circular base. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#718a81", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("vertical-grow-tower");
p.part("base-plinth", b(0,0,0,500,500,120).color(color));
p.part("lower-collar", b(0,0,120,570,570,100).color(color));
p.part("tier-one", b(0,0,470,500,500,90).color(color));
p.part("tier-two", b(0,0,850,500,500,90).color(color));
p.part("tier-three", b(0,0,1230,500,500,90).color(color));
p.part("top-lid", b(0,0,1610,520,520,70).color(color));
p.part("central-feed-column", c(0,0,120,1590,68,10).color(color));
p.part("side-port-left", c(-270,0,520,110,35,10).color(color));
p.part("side-port-right", c(270,0,900,110,35,10).color(color));
p.part("foot-a", c(-200,-200,0,90,38,10).color(color));
p.part("foot-b", c(200,-200,0,90,38,10).color(color));
p.part("foot-c", c(0,205,0,90,38,10).color(color));

return p.model();
