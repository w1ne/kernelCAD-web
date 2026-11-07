// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "circulation-pump-skid",
  license: 'CC0-1.0',
  title: "Circulation pump skid",
  description: "Compact recirculation unit with pump housing, motor block, inlet elbow and discharge riser. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e7975", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("circulation-pump-skid");
p.part("base-plate", b(0,0,0,900,470,80).color(color));
p.part("motor-block", b(-190,0,80,300,320,310).color(color));
p.part("coupling-guard", b(55,0,210,150,190,150).color(color));
p.part("pump-support", b(250,0,80,180,260,330).color(color));
p.part("front-nameplate", b(-190,-170,180,170,20,90).color(color));
p.part("inlet-pipe", b(470,-50,140,260,70,70).color(color));
p.part("discharge-pipe", b(300,0,410,75,70,260).color(color));
p.part("pump-volute", c(260,0,180,250,125,10).color(color));
p.part("inlet-flange", c(520,-50,140,65,88,10).color(color));
p.part("motor-endcap", c(-370,0,170,85,150,10).color(color));

return p.model();
