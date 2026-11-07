// SPDX-License-Identifier: CC0-1.0
// Cold-aisle roof panel: Overhead containment canopy with a light frame and repeated ceiling panels.

meta({
  name: "cold-aisle-roof-panel",
  license: 'CC0-1.0',
  title: "Cold-aisle roof panel",
  description: "Overhead containment canopy with a light frame and repeated ceiling panels. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("cold-aisle-roof-panel");
p.part("canopy-frame-front", b(0, -700, 0, 1400, 65, 90).color(steel));
p.part("canopy-frame-rear", b(0, 700, 0, 1400, 65, 90).color(steel));
p.part("canopy-left-beam", b(-670, 0, 0, 65, 1400, 90).color(steel));
p.part("canopy-right-beam", b(670, 0, 0, 65, 1400, 90).color(steel));
p.part("roof-panel-0", b(-500, 0, 90, 235, 1320, 28).color(polymer));
p.part("roof-panel-1", b(-250, 0, 90, 235, 1320, 28).color(steel));
p.part("roof-panel-2", b(0, 0, 90, 235, 1320, 28).color(steel));
p.part("roof-panel-3", b(250, 0, 90, 235, 1320, 28).color(steel));
p.part("roof-panel-4", b(500, 0, 90, 235, 1320, 28).color(steel));
p.part("support-post-front", c(-650, -680, 0, 2200, 26, 8).color(steel));
p.part("support-post-rear", c(650, 680, 0, 2200, 26, 8).color(steel));

return p.model();
