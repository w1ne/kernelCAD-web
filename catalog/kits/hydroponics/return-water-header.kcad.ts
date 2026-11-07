// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "return-water-header",
  license: 'CC0-1.0',
  title: "Return water header",
  description: "Raised collection header with four return inlets, end support saddles and a cleanout cap. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#688078", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("return-water-header");
p.part("header-pipe", b(0,0,200,1900,90,90).color(color));
p.part("support-left", b(-780,0,0,75,240,200).color(color));
p.part("support-center-left", b(-260,0,0,75,240,200).color(color));
p.part("support-center-right", b(260,0,0,75,240,200).color(color));
p.part("support-right", b(780,0,0,75,240,200).color(color));
p.part("inlet-left", c(-600,0,280,165,40,10).color(color));
p.part("inlet-mid-left", c(-200,0,280,165,40,10).color(color));
p.part("inlet-mid-right", c(200,0,280,165,40,10).color(color));
p.part("inlet-right", c(600,0,280,165,40,10).color(color));
p.part("cleanout", c(930,0,250,170,45,10).color(color));

return p.model();
