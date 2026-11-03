// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nutrient-measuring-cylinder",
  license: 'CC0-1.0',
  title: "Nutrient measuring cylinder",
  description: "Bench measuring vessel with a broad foot, graduated-band ridges and a pouring lip. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#789079", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nutrient-measuring-cylinder");
p.part("base-foot", b(0,0,0,290,290,50).color(color));
p.part("pouring-lip", b(85,0,600,110,80,40).color(color));
p.part("mark-low", b(0,-125,180,170,18,18).color(color));
p.part("mark-mid-low", b(0,-125,290,170,18,18).color(color));
p.part("mark-mid", b(0,-125,400,170,18,18).color(color));
p.part("mark-mid-high", b(0,-125,510,170,18,18).color(color));
p.part("vessel", c(0,0,50,570,100,10).color(color));
p.part("rim", c(0,0,620,34,122,10).color(color));
p.part("spout-tip", c(112,0,585,85,25,10).color(color));

return p.model();
