// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ev-metering-pedestal",
  license: 'CC0-1.0',
  title: "EV metering pedestal",
  description: "Utility metering post with a meter head, service panel, and protective plinth. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65716f", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-metering-pedestal");
p.part("base-skirt", b(0, 0, 0, 460, 390, 110).color(color));
p.part("pedestal-body", b(0, 0, 110, 350, 290, 1040).color(color));
p.part("meter-head", b(0, 0, 1150, 440, 360, 500).color(color));
p.part("meter-window", b(0, -190, 1320, 270, 32, 205).color(color));
p.part("meter-dial", c(0, -214, 1430, 28, 56, 10).color(color));
p.part("service-door", b(0, -158, 350, 265, 25, 390).color(color));
p.part("cable-riser", c(0, 0, 0, 250, 48, 8).color(color));

return p.model();
