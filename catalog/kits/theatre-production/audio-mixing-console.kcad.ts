// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "audio-mixing-console",
  license: 'CC0-1.0',
  title: "Audio mixing console",
  description: "Portable audio desk with a sloped control panel, display bridge, channel fader strips and rack base. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#616d79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("audio-mixing-console");
p.part("base", b(0,0,0,1200,780,180).color(color));
p.part("sloped-panel", b(0,0,180,1160,730,180).color(color));
p.part("display-bridge", b(0,270,360,1120,150,70).color(color));
p.part("display-left", b(-250,240,430,350,40,220).color(color));
p.part("display-right", b(250,240,430,350,40,220).color(color));
p.part("fader-bank-left", b(-390,-220,350,300,280,45).color(color));
p.part("fader-bank-right", b(390,-220,350,300,280,45).color(color));
p.part("arm-rest", b(0,-385,220,1120,70,65).color(color));
p.part("encoder-left", c(-430,-100,390,55,25,10).color(color));
p.part("encoder-mid", c(0,-100,390,55,25,10).color(color));
p.part("encoder-right", c(430,-100,390,55,25,10).color(color));

return p.model();
