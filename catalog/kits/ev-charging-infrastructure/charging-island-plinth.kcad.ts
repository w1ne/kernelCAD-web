// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "charging-island-plinth",
  license: 'CC0-1.0',
  title: "Charging island plinth",
  description: "Raised site island with two charger mounting pads, edge curb, and corner markers. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#85827a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("charging-island-plinth");
p.part("island-curb", b(0, 0, 0, 2600, 820, 180).color(color));
p.part("raised-deck", b(0, 0, 180, 2400, 620, 120).color(color));
p.part("left-mount-pad", b(-700, 0, 300, 480, 470, 180).color(color));
p.part("right-mount-pad", b(700, 0, 300, 480, 470, 180).color(color));
p.part("corner-marker-0", c(-1150, -270, 300, 120, 55, 8).color(color));
p.part("corner-marker-1", c(1150, -270, 300, 120, 55, 8).color(color));
p.part("corner-marker-2", c(-1150, 270, 300, 120, 55, 8).color(color));
p.part("corner-marker-3", c(1150, 270, 300, 120, 55, 8).color(color));

return p.model();
