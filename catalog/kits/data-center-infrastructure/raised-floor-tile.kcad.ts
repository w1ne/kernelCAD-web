// SPDX-License-Identifier: CC0-1.0
// Raised floor tile: steel access-floor panel with polymer edge trim on pedestals and stringers.

meta({
  name: "raised-floor-tile",
  license: 'CC0-1.0',
  title: "Raised floor tile",
  description: "Square access-floor panel: a painted-steel tile with polymer edge trim and corner hold-down screws, carried 150 mm above the slab on four steel pedestals joined by stringers under its edges. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#4f7485', { label: 'Painted steel' });
const polymer = param('polymer', '#2f3438', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#2f3438',
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
// Pedestals (z 0-122) carry four stringers (z 122-150) that run under the tile edges between
// the pedestal heads; the 588 mm steel tile sits on them at z 150 and edge trim wraps it to 600 mm.
p.part("pedestal-0", c(-250, -250, 0, 122, 32, 8).color(steel));
p.part("pedestal-1", c(250, -250, 0, 122, 32, 8).color(steel));
p.part("pedestal-2", c(-250, 250, 0, 122, 32, 8).color(steel));
p.part("pedestal-3", c(250, 250, 0, 122, 32, 8).color(steel));
p.part("stringer-front", b(0, -250, 122, 528, 28, 28).color(steel));
p.part("stringer-rear", b(0, 250, 122, 528, 28, 28).color(steel));
p.part("stringer-left", b(-250, 0, 122, 28, 472, 28).color(steel));
p.part("stringer-right", b(250, 0, 122, 28, 472, 28).color(steel));
p.part("tile-panel", b(0, 0, 150, 588, 588, 35).color(steel));
p.part("edge-trim-front", b(0, -297, 150, 600, 6, 35).color(polymer));
p.part("edge-trim-rear", b(0, 297, 150, 600, 6, 35).color(polymer));
p.part("edge-trim-left", b(-297, 0, 150, 6, 588, 35).color(polymer));
p.part("edge-trim-right", b(297, 0, 150, 6, 588, 35).color(polymer));
p.part("corner-fastener-0", c(-250, -250, 185, 3, 8, 8).color(steel));
p.part("corner-fastener-1", c(250, -250, 185, 3, 8, 8).color(steel));
p.part("corner-fastener-2", c(-250, 250, 185, 3, 8, 8).color(steel));
p.part("corner-fastener-3", c(250, 250, 185, 3, 8, 8).color(steel));

return p.model();
