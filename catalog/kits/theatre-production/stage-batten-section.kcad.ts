// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-batten-section",
  license: 'CC0-1.0',
  title: "Stage batten section",
  description: "Short overhead batten assembly with a long tube, end plates, two suspension eyes and a cable clip. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#777b80", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-batten-section");
p.part("batten", b(0,0,0,2500,80,80).color(color));
p.part("end-plate-left", b(-1240,0,0,45,150,100).color(color));
p.part("end-plate-right", b(1240,0,0,45,150,100).color(color));
p.part("cable-clip", b(0,-55,35,160,50,65).color(color));
p.part("suspension-tab-left", b(-850,0,70,90,120,85).color(color));
p.part("suspension-tab-right", b(850,0,70,90,120,85).color(color));
p.part("hanger-eye-left", c(-850,0,150,110,38,10).color(color));
p.part("hanger-eye-right", c(850,0,150,110,38,10).color(color));

return p.model();
