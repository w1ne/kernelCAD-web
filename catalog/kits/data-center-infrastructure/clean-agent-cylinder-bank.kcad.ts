// SPDX-License-Identifier: CC0-1.0
// Clean-agent cylinder bank: Suppression cylinder rack with manifold header, valve caps, and anchoring frame.

meta({
  name: "clean-agent-cylinder-bank",
  license: 'CC0-1.0',
  title: "Clean-agent cylinder bank",
  description: "Suppression cylinder rack with manifold header, valve caps, and anchoring frame. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#c99b35', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("clean-agent-cylinder-bank");
p.part("cylinder-rack-base", b(0, 0, 0, 1800, 640, 100).color(steel));
p.part("upper-restraint", b(0, 0, 1320, 1780, 100, 90).color(steel));
p.part("lower-restraint", b(0, 0, 420, 1780, 100, 90).color(steel));
p.part("agent-cylinder-0", c(-700, 0, 100, 1250, 125, 12).color(steel));
p.part("agent-cylinder-1", c(-350, 0, 100, 1250, 125, 12).color(steel));
p.part("agent-cylinder-2", c(0, 0, 100, 1250, 125, 12).color(steel));
p.part("agent-cylinder-3", c(350, 0, 100, 1250, 125, 12).color(steel));
p.part("agent-cylinder-4", c(700, 0, 100, 1250, 125, 12).color(steel));
p.part("manifold-header", hy(0, -280, 1320, 1600, 52, 10).color(steel));
p.part("valve-cap-0", c(-700, -280, 1372, 100, 42, 8).color(polymer));
p.part("valve-cap-1", c(-350, -280, 1372, 100, 42, 8).color(steel));
p.part("valve-cap-2", c(0, -280, 1372, 100, 42, 8).color(steel));
p.part("valve-cap-3", c(350, -280, 1372, 100, 42, 8).color(steel));
p.part("valve-cap-4", c(700, -280, 1372, 100, 42, 8).color(steel));

return p.model();
