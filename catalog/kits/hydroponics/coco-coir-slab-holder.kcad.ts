// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "coco-coir-slab-holder",
  license: 'CC0-1.0',
  title: "Coir slab holder",
  description: "Open-sided slab cradle with a perforated-looking support deck and central drain line. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#826f5f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("coco-coir-slab-holder");
p.part("left-end", b(-760,0,0,70,460,260).color(color));
p.part("right-end", b(760,0,0,70,460,260).color(color));
p.part("front-rail", b(0,-200,100,1500,55,55).color(color));
p.part("back-rail", b(0,200,100,1500,55,55).color(color));
p.part("slab", b(0,0,170,1400,380,180).color(color));
p.part("deck-strip-a", b(-520,0,0,90,410,95).color(color));
p.part("deck-strip-b", b(0,0,0,90,410,95).color(color));
p.part("deck-strip-c", b(520,0,0,90,410,95).color(color));
p.part("irrigation-line", b(0,230,290,1400,35,35).color(color));
p.part("drain-line", c(0,-240,0,120,35,10).color(color));

return p.model();
