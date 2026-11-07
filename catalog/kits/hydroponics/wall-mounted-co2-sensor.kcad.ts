// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "wall-mounted-co2-sensor",
  license: 'CC0-1.0',
  title: "Wall-mounted CO2 sensor",
  description: "Compact wall enclosure with a vented cover, mounting lugs and short cable gland. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#71877c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("wall-mounted-co2-sensor");
p.part("backplate", b(0,0,0,260,90,340).color(color));
p.part("sensor-case", b(0,-20,35,230,100,265).color(color));
p.part("top-vent", b(0,-80,215,150,20,26).color(color));
p.part("middle-vent", b(0,-80,170,150,20,26).color(color));
p.part("bottom-vent", b(0,-80,125,150,20,26).color(color));
p.part("left-lug", b(-160,0,20,60,100,55).color(color));
p.part("right-lug", b(160,0,20,60,100,55).color(color));
p.part("cable-gland", c(80,-40,0,100,28,10).color(color));
p.part("sensor-cap", c(0,-30,300,95,74,10).color(color));

return p.model();
