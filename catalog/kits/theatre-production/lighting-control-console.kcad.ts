// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "lighting-control-console",
  license: 'CC0-1.0',
  title: "Lighting control console",
  description: "Theatre lighting desk with two display hoods, angled control surface, key bays and side cheeks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626d79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("lighting-control-console");
p.part("console-base", b(0,0,0,1200,720,180).color(color));
p.part("control-surface", b(0,-30,180,1180,680,230).color(color));
p.part("left-cheek", b(-570,0,180,65,700,430).color(color));
p.part("right-cheek", b(570,0,180,65,700,430).color(color));
p.part("left-display", b(-280,150,420,380,160,300).color(color));
p.part("right-display", b(280,150,420,380,160,300).color(color));
p.part("keyboard-panel", b(0,-280,420,420,170,55).color(color));
p.part("fader-bank-left", b(-390,-240,420,250,180,55).color(color));
p.part("fader-bank-right", b(390,-240,420,250,180,55).color(color));
p.part("trackball", c(0,-80,400,70,40,10).color(color));
p.part("encoder-left", c(-160,-180,445,55,24,10).color(color));
p.part("encoder-right", c(160,-180,445,55,24,10).color(color));

return p.model();
