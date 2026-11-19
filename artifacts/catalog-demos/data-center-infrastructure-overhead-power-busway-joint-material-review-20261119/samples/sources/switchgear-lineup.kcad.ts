// SPDX-License-Identifier: CC0-1.0
// Switchgear lineup: Joined electrical bays with breaker doors, instrument panels, and bus compartment.

meta({
  name: "switchgear-lineup",
  license: 'CC0-1.0',
  title: "Switchgear lineup",
  description: "Joined electrical bays with breaker doors, instrument panels, and bus compartment. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("switchgear-lineup");
p.part("lineup-base", b(0, 0, 0, 2500, 900, 110).color(steel));
p.part("bay-0", b(-900, 0, 110, 560, 820, 1950).color(steel));
p.part("breaker-door-0", b(-900, -425, 280, 520, 30, 1350).color(steel));
p.part("instrument-panel-0", b(-900, -450, 1680, 390, 25, 200).color(steel));
p.part("selector-0", c(-730, -485, 1710, 35, 18, 8).color(polymer));
p.part("bay-1", b(-300, 0, 110, 560, 820, 1950).color(steel));
p.part("breaker-door-1", b(-300, -425, 280, 520, 30, 1350).color(steel));
p.part("instrument-panel-1", b(-300, -450, 1680, 390, 25, 200).color(steel));
p.part("selector-1", c(-130, -485, 1710, 35, 18, 8).color(polymer));
p.part("bay-2", b(300, 0, 110, 560, 820, 1950).color(steel));
p.part("breaker-door-2", b(300, -425, 280, 520, 30, 1350).color(steel));
p.part("instrument-panel-2", b(300, -450, 1680, 390, 25, 200).color(steel));
p.part("selector-2", c(470, -485, 1710, 35, 18, 8).color(polymer));
p.part("bay-3", b(900, 0, 110, 560, 820, 1950).color(steel));
p.part("breaker-door-3", b(900, -425, 280, 520, 30, 1350).color(steel));
p.part("instrument-panel-3", b(900, -450, 1680, 390, 25, 200).color(steel));
p.part("selector-3", c(1070, -485, 1710, 35, 18, 8).color(polymer));

return p.model();
