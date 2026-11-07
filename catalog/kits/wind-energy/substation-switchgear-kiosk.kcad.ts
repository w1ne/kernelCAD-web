// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "substation-switchgear-kiosk",
  license: 'CC0-1.0',
  title: "Substation switchgear kiosk",
  description: "Low switchgear kiosk with paired doors, roof cap, service step and cable plinth. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758078", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("substation-switchgear-kiosk");
p.part("base",b(0,0,0,1700,1200,80).color(color));
p.part("body",b(0,0,760,1600,1100,1440).color(color));
p.part("roof",b(0,0,1530,1750,1250,100).color(color));
p.part("door-left",b(-400,-560,140,650,22,1100).color(color));
p.part("door-right",b(400,-560,140,650,22,1100).color(color));
p.part("step",b(0,-720,30,1000,250,70).color(color));

return p.model();
