// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "fleet-charging-canopy",
  license: 'CC0-1.0',
  title: "Fleet charging canopy",
  description: "Open fleet shelter with repeated charger bays, roof frame, and protective corner posts. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7770", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const hx=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=8)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z).scale(scale);

const p=assembly("fleet-charging-canopy");
p.part("left-column-front", b(-1900, -620, 0, 150, 150, 3600).color(color));
p.part("left-column-rear", b(-1900, 620, 0, 150, 150, 3600).color(color));
p.part("right-column-front", b(1900, -620, 0, 150, 150, 3600).color(color));
p.part("right-column-rear", b(1900, 620, 0, 150, 150, 3600).color(color));
p.part("front-rafter", b(0, -620, 3600, 4100, 1250, 130).color(color));
p.part("rear-rafter", b(0, 620, 3600, 4100, 1250, 130).color(color));
p.part("roof-spine", hx(0, 0, 3730, 4300, 82, 8).color(color));
p.part("bay-divider-0", b(-1550, 0, 0, 38, 1400, 2400).color(color));
p.part("bay-divider-1", b(-520, 0, 0, 38, 1400, 2400).color(color));
p.part("bay-divider-2", b(510, 0, 0, 38, 1400, 2400).color(color));
p.part("bay-divider-3", b(1540, 0, 0, 38, 1400, 2400).color(color));
p.part("charger-post-1", b(-1500, 0, 0, 210, 240, 2050).color(color));
p.part("cable-drop-1", hy(-1335, -170, 1120, 700, 17, 8).color(color));
p.part("charger-post-2", b(-500, 0, 0, 210, 240, 2050).color(color));
p.part("cable-drop-2", hy(-335, -170, 1120, 700, 17, 8).color(color));
p.part("charger-post-3", b(500, 0, 0, 210, 240, 2050).color(color));
p.part("cable-drop-3", hy(665, -170, 1120, 700, 17, 8).color(color));
p.part("charger-post-4", b(1500, 0, 0, 210, 240, 2050).color(color));
p.part("cable-drop-4", hy(1665, -170, 1120, 700, 17, 8).color(color));

return p.model();
