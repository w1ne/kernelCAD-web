// SPDX-License-Identifier: CC0-1.0
// Distribution panelboard: Panelboard enclosure with hinged door, breaker rows, and cable entry gland.

meta({
  name: "distribution-panelboard",
  license: 'CC0-1.0',
  title: "Distribution panelboard",
  description: "Panelboard enclosure with hinged door, breaker rows, and cable entry gland. Knobs: overall scale; painted steel, engineering polymer, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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
const rubber = param('rubber', '#252a2d', { label: 'Rubber and elastomer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
    rubber: '#252a2d',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
    rubber: '#2a3033',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("distribution-panelboard");
p.part("wall-enclosure", b(0, 0, 0, 760, 300, 1300).color(steel));
p.part("door", b(0, -165, 90, 700, 32, 1120).color(steel));
p.part("interior-deadfront", b(0, -188, 250, 560, 22, 780).color(steel));
p.part("breaker-row-0", b(0, -210, 350, 460, 26, 105).color(steel));
p.part("breaker-row-1", b(0, -210, 510, 460, 26, 105).color(steel));
p.part("breaker-row-2", b(0, -210, 670, 460, 26, 105).color(steel));
p.part("breaker-row-3", b(0, -210, 830, 460, 26, 105).color(steel));
p.part("cable-entry", c(0, 0, 0, 65, 58, 10).color(rubber));
p.part("door-latch", c(300, -195, 650, 46, 24, 8).color(polymer));

return p.model();
