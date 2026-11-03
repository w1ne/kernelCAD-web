// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sump-return-tank",
  license: 'CC0-1.0',
  title: "Sump return tank",
  description: "Low collection tank with screened top grate, paired inlet stubs and a pump access corner. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657e76", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("sump-return-tank");
p.part("tank-base", b(0,0,0,1550,1050,150).color(color));
p.part("front-wall", b(0,-500,150,1550,65,610).color(color));
p.part("back-wall", b(0,500,150,1550,65,610).color(color));
p.part("left-wall", b(-742,0,150,65,940,610).color(color));
p.part("right-wall", b(742,0,150,65,940,610).color(color));
p.part("screen-panel-a", b(-380,0,760,690,950,45).color(color));
p.part("screen-panel-b", b(380,0,760,690,950,45).color(color));
p.part("access-lid", b(575,-320,780,260,300,35).color(color));
p.part("inlet-left", c(-560,-540,480,180,38,10).color(color));
p.part("inlet-right", c(560,-540,480,180,38,10).color(color));
p.part("pump-socket", c(560,470,0,220,72,10).color(color));

return p.model();
