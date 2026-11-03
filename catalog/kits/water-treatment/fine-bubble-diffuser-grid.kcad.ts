// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "fine-bubble-diffuser-grid",
  license: 'CC0-1.0',
  title: "Fine bubble diffuser grid",
  description: "Rectangular diffuser grid with parallel air laterals, end headers and short support feet. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737d78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("fine-bubble-diffuser-grid");
p.part("header-left",b(-440,0,60,60,820,60).color(color));
p.part("header-right",b(440,0,60,60,820,60).color(color));
p.part("lateral-0",b(0,-350,60,820,28,28).color(color));
p.part("lateral-1",b(0,-250,60,820,28,28).color(color));
p.part("lateral-2",b(0,-150,60,820,28,28).color(color));
p.part("lateral-3",b(0,-50,60,820,28,28).color(color));
p.part("lateral-4",b(0,50,60,820,28,28).color(color));
p.part("lateral-5",b(0,150,60,820,28,28).color(color));
p.part("lateral-6",b(0,250,60,820,28,28).color(color));
p.part("lateral-7",b(0,350,60,820,28,28).color(color));
p.part("diffuser-0",c(-330,-350,88,22,18,10).color(color));
p.part("diffuser-1",c(-220,-350,88,22,18,10).color(color));
p.part("diffuser-2",c(-110,-350,88,22,18,10).color(color));
p.part("diffuser-3",c(0,-350,88,22,18,10).color(color));
p.part("diffuser-4",c(110,-350,88,22,18,10).color(color));
p.part("diffuser-5",c(220,-350,88,22,18,10).color(color));
p.part("diffuser-6",c(330,-350,88,22,18,10).color(color));
p.part("foot--360",b(-360,0,0,55,60,60).color(color));
p.part("foot-360",b(360,0,0,55,60,60).color(color));

return p.model();
