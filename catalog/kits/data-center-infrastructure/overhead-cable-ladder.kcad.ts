// SPDX-License-Identifier: CC0-1.0
// Overhead cable ladder: Suspended ladder tray with side rails, cross rungs, and ceiling hangers.

meta({
  name: "overhead-cable-ladder",
  license: 'CC0-1.0',
  title: "Overhead cable ladder",
  description: "Suspended ladder tray with side rails, cross rungs, and ceiling hangers. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("overhead-cable-ladder");
p.part("left-side-rail", b(0, -260, 0, 2400, 65, 55).color(steel));
p.part("right-side-rail", b(0, 260, 0, 2400, 65, 55).color(steel));
p.part("cross-rung-0", b(-1080, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-1", b(-900, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-2", b(-720, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-3", b(-540, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-4", b(-360, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-5", b(-180, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-6", b(0, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-7", b(180, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-8", b(360, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-9", b(540, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-10", b(720, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-11", b(900, 0, 8, 60, 455, 38).color(steel));
p.part("cross-rung-12", b(1080, 0, 8, 60, 455, 38).color(steel));
p.part("hanger-left", b(-850, 0, 55, 80, 620, 300).color(steel));
p.part("hanger-right", b(850, 0, 55, 80, 620, 300).color(steel));
p.part("hanger-cap-left", c(-850, 0, 355, 55, 50, 8).color(polymer));
p.part("hanger-cap-right", c(850, 0, 355, 55, 50, 8).color(steel));

return p.model();
