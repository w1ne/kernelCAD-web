// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "blackout-curtain-drive",
  license: 'CC0-1.0',
  title: "Blackout curtain drive",
  description: "Greenhouse shade-screen drive assembly with a motor block, roller shaft and end supports. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6f8178", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("blackout-curtain-drive");
p.part("mount-plate", b(0,0,0,900,300,55).color(color));
p.part("left-bracket", b(-420,0,55,65,260,550).color(color));
p.part("right-bracket", b(420,0,55,65,260,550).color(color));
p.part("motor-box", b(-270,-180,150,260,180,280).color(color));
p.part("screen-rail", b(0,0,480,850,65,65).color(color));
p.part("curtain-weight", b(0,500,0,760,60,80).color(color));
p.part("limit-switch-box", b(350,-130,360,140,120,115).color(color));
p.part("roller-tube", c(0,0,350,150,45,10).color(color));
p.part("drive-coupler", c(-430,0,300,140,55,10).color(color));
p.part("idler-cap", c(430,0,360,100,54,10).color(color));

return p.model();
