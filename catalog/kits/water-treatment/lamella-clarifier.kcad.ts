// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "lamella-clarifier",
  license: 'CC0-1.0',
  title: "Lamella plate clarifier",
  description: "Rectangular clarifier frame with a sloped-look plate pack, inlet compartment and collection trough. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65736f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("lamella-clarifier");
p.part("tank-floor",b(0,0,0,1100,680,40).color(color));
p.part("wall-left",b(0,-320,20,1100,40,360).color(color));
p.part("wall-right",b(0,320,20,1100,40,360).color(color));
p.part("plate-pack",b(0,0,230,640,400,250).color(color));
p.part("plate-0",b(-250,0,250,28,380,250).color(color));
p.part("plate-1",b(-165,0,250,28,380,250).color(color));
p.part("plate-2",b(-80,0,250,28,380,250).color(color));
p.part("plate-3",b(5,0,250,28,380,250).color(color));
p.part("plate-4",b(90,0,250,28,380,250).color(color));
p.part("plate-5",b(175,0,250,28,380,250).color(color));
p.part("inlet-box",b(-460,0,160,150,580,220).color(color));
p.part("launder",b(450,0,360,80,720,60).color(color));

return p.model();
