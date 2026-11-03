// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "teaser-border",
  license: 'CC0-1.0',
  title: "Teaser border",
  description: "Horizontal masking border with a rectangular frame, hanging cloth and top rigging sleeves. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#636c79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("teaser-border");
p.part("cloth", b(0,0,0,2100,65,650).color(color));
p.part("top-sleeve", b(0,0,650,2160,100,85).color(color));
p.part("left-hem", b(-1025,0,0,55,80,650).color(color));
p.part("right-hem", b(1025,0,0,55,80,650).color(color));
p.part("bottom-weight", b(0,0,0,2100,70,55).color(color));
p.part("hang-tab-left", b(-900,0,720,70,90,80).color(color));
p.part("hang-tab-mid", b(0,0,720,70,90,80).color(color));
p.part("hang-tab-right", b(900,0,720,70,90,80).color(color));
p.part("grommet-left", c(-900,0,760,50,22,10).color(color));
p.part("grommet-right", c(900,0,760,50,22,10).color(color));

return p.model();
