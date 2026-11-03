// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dimmer-rack",
  license: 'CC0-1.0',
  title: "Dimmer rack",
  description: "Portable lighting-control rack with vented front panel, breaker rows and top cable tray. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#686f78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dimmer-rack");
p.part("base", b(0,0,0,800,720,90).color(color));
p.part("left-upright", b(-350,0,90,55,680,1550).color(color));
p.part("right-upright", b(350,0,90,55,680,1550).color(color));
p.part("top-panel", b(0,0,1640,800,720,90).color(color));
p.part("front-panel", b(0,-330,180,650,45,1330).color(color));
p.part("vent-low", b(0,-360,470,420,18,26).color(color));
p.part("vent-mid", b(0,-360,570,420,18,26).color(color));
p.part("vent-high", b(0,-360,670,420,18,26).color(color));
p.part("cable-tray", b(0,340,1440,760,90,120).color(color));
p.part("wheel-left", c(-300,-260,0,125,48,10).color(color));
p.part("wheel-right", c(300,-260,0,125,48,10).color(color));
p.part("indicator", c(245,-370,1280,70,25,10).color(color));

return p.model();
