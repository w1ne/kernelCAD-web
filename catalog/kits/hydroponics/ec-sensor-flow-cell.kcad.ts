// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ec-sensor-flow-cell",
  license: 'CC0-1.0',
  title: "EC sensor flow cell",
  description: "Inline conductivity cell with paired unions, removable electrode cap and support feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#63827d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("ec-sensor-flow-cell");
p.part("base-plate", b(0,0,0,520,300,50).color(color));
p.part("support-left", b(-175,0,50,55,55,190).color(color));
p.part("support-right", b(175,0,50,55,55,190).color(color));
p.part("sensor-block", b(0,0,240,300,270,210).color(color));
p.part("cable-box", b(0,160,450,180,100,120).color(color));
p.part("left-union", b(-325,0,255,230,75,75).color(color));
p.part("right-union", b(325,0,255,230,75,75).color(color));
p.part("flow-body", c(0,0,120,300,112,10).color(color));
p.part("electrode-cap", c(0,0,420,90,70,10).color(color));
p.part("probe-tip", c(0,0,510,240,22,10).color(color));

return p.model();
