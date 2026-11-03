// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "propagation-plug-tray",
  license: 'CC0-1.0',
  title: "Propagation plug tray",
  description: "Shallow seedling insert with a broad rim, four rows of tapered plug cells and carry tabs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#798578", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("propagation-plug-tray");
p.part("tray-floor", b(0,0,0,760,520,45).color(color));
p.part("front-rim", b(0,-255,45,760,40,50).color(color));
p.part("back-rim", b(0,255,45,760,40,50).color(color));
p.part("left-rim", b(-360,0,45,40,480,50).color(color));
p.part("right-rim", b(360,0,45,40,480,50).color(color));
p.part("cell-row-front", b(0,-145,45,700,28,35).color(color));
p.part("cell-row-mid-front", b(0,-45,45,700,28,35).color(color));
p.part("cell-row-mid-back", b(0,55,45,700,28,35).color(color));
p.part("cell-row-back", b(0,155,45,700,28,35).color(color));
p.part("carry-grip-left", c(-410,0,45,100,32,10).color(color));
p.part("carry-grip-right", c(410,0,45,100,32,10).color(color));

return p.model();
