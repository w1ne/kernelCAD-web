// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "uv-disinfection-channel",
  license: 'CC0-1.0',
  title: "UV disinfection channel",
  description: "Covered UV channel with support frame, lamp cassette bars and service bridge. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#637774", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("uv-disinfection-channel");
p.part("channel-floor",b(0,0,0,1200,520,40).color(color));
p.part("wall-front",b(0,-230,20,1200,60,300).color(color));
p.part("wall-back",b(0,230,20,1200,60,300).color(color));
p.part("bridge",b(0,0,340,1200,580,55).color(color));
p.part("lamp-0",c(-400,0,180,280,28,10).color(color));
p.part("lamp-1",c(-200,0,180,280,28,10).color(color));
p.part("lamp-2",c(0,0,180,280,28,10).color(color));
p.part("lamp-3",c(200,0,180,280,28,10).color(color));
p.part("lamp-4",c(400,0,180,280,28,10).color(color));
p.part("frame-post--520",b(-520,0,375,40,50,160).color(color));
p.part("frame-post-520",b(520,0,375,40,50,160).color(color));

return p.model();
