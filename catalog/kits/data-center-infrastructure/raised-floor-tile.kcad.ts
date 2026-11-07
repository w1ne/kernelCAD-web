// SPDX-License-Identifier: CC0-1.0
// Raised floor tile: Square access-floor panel with support pedestals and edge stringers.

meta({
  name: "raised-floor-tile",
  license: 'CC0-1.0',
  title: "Raised floor tile",
  description: "Square access-floor panel with support pedestals and edge stringers. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("raised-floor-tile");
p.part("tile-panel", b(0, 0, 0, 600, 600, 45).color(polymer));
p.part("edge-frame", b(0, 0, 45, 590, 590, 22).color(steel));
p.part("pedestal-0", c(-250, -250, 0, 150, 32, 8).color(steel));
p.part("pedestal-1", c(250, -250, 0, 150, 32, 8).color(steel));
p.part("pedestal-2", c(-250, 250, 0, 150, 32, 8).color(steel));
p.part("pedestal-3", c(250, 250, 0, 150, 32, 8).color(steel));
p.part("stringer-x", b(0, 0, 145, 600, 28, 28).color(steel));
p.part("stringer-y", b(0, 0, 145, 28, 600, 28).color(steel));
p.part("corner-fastener", c(-260, -260, 46, 15, 8, 8).color(steel));

return p.model();
