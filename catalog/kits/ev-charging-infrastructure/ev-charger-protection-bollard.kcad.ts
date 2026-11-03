// SPDX-License-Identifier: CC0-1.0
// Original generic EV-charging scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "ev-charger-protection-bollard",
  license: 'CC0-1.0',
  title: "Charger protection bollard",
  description: "Heavy tubular guard post with a protective cap and square anchor plate. Knobs: overall scale and asset color.",
  tags: ['EV charging', 'electric vehicle', 'charging station', 'low poly', 'scene prop', 'CC0'],
  kit: "ev-charging-infrastructure",
  category: 'prop',
  origin: 'base',
  compat: ['ev-charging', 'parking', 'fleet', 'electric-vehicle', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9d6943", { label: 'Asset color' });
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("ev-charger-protection-bollard");
p.part("anchor-flange", c(0, 0, 0, 60, 150, 10).color(color));
p.part("guard-post", c(0, 0, 58, 930, 72, 10).color(color));
p.part("top-cap", c(0, 0, 988, 68, 80, 10).color(color));
p.part("base-anchor-0", c(-94, -94, 0, 75, 22, 8).color(color));
p.part("base-anchor-1", c(94, -94, 0, 75, 22, 8).color(color));
p.part("base-anchor-2", c(-94, 94, 0, 75, 22, 8).color(color));
p.part("base-anchor-3", c(94, 94, 0, 75, 22, 8).color(color));

return p.model();
