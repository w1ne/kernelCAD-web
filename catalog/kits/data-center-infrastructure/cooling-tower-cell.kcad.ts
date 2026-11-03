// SPDX-License-Identifier: CC0-1.0
// Original generic data-center scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cooling-tower-cell",
  license: 'CC0-1.0',
  title: "Cooling tower cell",
  description: "Open cooling-tower cell with basin, fan deck, fill pack, and water riser. Knobs: overall scale and asset color.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'low poly', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#768079", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("cooling-tower-cell");
p.part("basin", b(0, 0, 0, 1800, 1500, 300).color(color));
p.part("fill-pack", b(0, 0, 300, 1450, 1200, 900).color(color));
p.part("frame-post-0", b(-780, -630, 300, 85, 85, 1500).color(color));
p.part("frame-post-1", b(780, -630, 300, 85, 85, 1500).color(color));
p.part("frame-post-2", b(-780, 630, 300, 85, 85, 1500).color(color));
p.part("frame-post-3", b(780, 630, 300, 85, 85, 1500).color(color));
p.part("fan-deck", b(0, 0, 1800, 1800, 1500, 100).color(color));
p.part("fan-stack", c(0, 0, 1900, 220, 420, 12).color(color));
p.part("water-riser", c(650, 0, 300, 1500, 55, 10).color(color));

return p.model();
