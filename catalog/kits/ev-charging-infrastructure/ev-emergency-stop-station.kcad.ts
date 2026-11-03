// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ev-emergency-stop-station",
  license: 'CC0-1.0',
  title: "EV emergency-stop station",
  description: "Protected emergency control post with an overhanging guard and prominent actuator. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a3443d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-emergency-stop-station");
p.part("ground-plate", b(0, 0, 0, 420, 420, 50).color(color));
p.part("control-post", b(0, 0, 50, 230, 230, 1050).color(color));
p.part("guard-hood", b(0, -145, 930, 330, 130, 170).color(color));
p.part("actuator-base", c(0, -220, 620, 100, 80, 10).color(color));
p.part("stop-actuator", c(0, -235, 700, 52, 54, 10).color(color));
p.part("label-frame", b(0, -130, 835, 160, 18, 54).color(color));

return p.model();
