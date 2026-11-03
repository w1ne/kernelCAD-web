// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dosing-pump-skid",
  license: 'CC0-1.0',
  title: "Dosing pump skid",
  description: "Portable dosing frame with two metering heads, chemical pickup tubes and a small service panel. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7c7a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dosing-pump-skid");
p.part("base-skid", b(0,0,0,960,480,90).color(color));
p.part("back-panel", b(0,210,90,900,45,840).color(color));
p.part("pump-shelf", b(0,0,510,850,430,50).color(color));
p.part("control-box", b(300,160,560,260,130,290).color(color));
p.part("left-pump-body", b(-230,0,560,210,230,230).color(color));
p.part("right-pump-body", b(80,0,560,210,230,230).color(color));
p.part("left-tube-rail", b(-230,-160,240,30,35,380).color(color));
p.part("right-tube-rail", b(80,-160,240,30,35,380).color(color));
p.part("left-meter-head", c(-230,0,790,130,76,10).color(color));
p.part("right-meter-head", c(80,0,790,130,76,10).color(color));
p.part("pickup-left", c(-230,-180,0,270,24,10).color(color));
p.part("pickup-right", c(80,-180,0,270,24,10).color(color));

return p.model();
