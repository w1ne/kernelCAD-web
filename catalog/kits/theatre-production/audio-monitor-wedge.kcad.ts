// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "audio-monitor-wedge",
  license: 'CC0-1.0',
  title: "Audio monitor wedge",
  description: "Low angled stage monitor enclosure with a broad grille, end cheeks and rear connector plate. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#646c77", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("audio-monitor-wedge");
p.part("speaker-body", b(0,0,0,760,520,240).color(color));
p.part("front-grille", b(0,-245,120,700,28,200).color(color));
p.part("top-panel", b(0,0,240,760,500,55).color(color));
p.part("left-cheek", b(-365,0,0,35,500,285).color(color));
p.part("right-cheek", b(365,0,0,35,500,285).color(color));
p.part("rear-panel", b(0,245,0,700,30,260).color(color));
p.part("carry-recess", b(0,200,80,220,28,75).color(color));
p.part("woofer", c(0,-270,100,165,180,10).color(color));
p.part("connector", c(250,275,120,100,30,10).color(color));

return p.model();
