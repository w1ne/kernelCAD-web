// SPDX-License-Identifier: CC0-1.0
// Data-center battery cabinet: Battery cabinet with repeated access drawers, terminal details, ventilation slots, and an isolated base plinth.

meta({
  name: "data-center-battery-cabinet",
  license: 'CC0-1.0',
  title: "Data-center battery cabinet",
  description: "Battery cabinet with repeated access drawers, terminal details, ventilation slots, and an isolated base plinth. Knobs: overall scale; painted steel, engineering polymer, glass and display lenses, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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
const glass = param('glass', '#42bac9', { label: 'Glass and display lenses' });
const rubber = param('rubber', '#252a2d', { label: 'Rubber and elastomer' });

presets({
  facilityStandard: {
    steel: '#4f7485',
    polymer: '#c99b35',
    glass: '#42bac9',
    rubber: '#252a2d',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
    glass: '#53d5e0',
    rubber: '#2a3033',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("data-center-battery-cabinet");
p.part("base-plinth", b(0, 0, 0, 930, 910, 100).color(steel));
p.part("cabinet-shell", b(0, 0, 100, 850, 840, 1820).color(steel));
p.part("operator-display", b(-229.50000000000003, -452.0, 1382.3999999999999, 155, 24, 115).color(glass));
p.part("door-handle", b(306.0, -448.0, 825.6, 35, 30, 260).color(polymer));
p.part("control-knob", c(-229.50000000000003, -476.0, 1228.8, 38, 22, 8).color(polymer));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(rubber));
p.part("battery-drawer-0", b(0, -390, 200, 610, 34, 205).color(steel));
p.part("battery-drawer-1", b(0, -390, 460, 610, 34, 205).color(steel));
p.part("battery-drawer-2", b(0, -390, 720, 610, 34, 205).color(steel));
p.part("battery-drawer-3", b(0, -390, 980, 610, 34, 205).color(steel));
p.part("battery-drawer-4", b(0, -390, 1240, 610, 34, 205).color(steel));
p.part("battery-vent-slot-0", b(0, -414, 425, 360, 12, 12).color(steel));
p.part("battery-vent-slot-1", b(0, -414, 470, 360, 12, 12).color(steel));
p.part("battery-vent-slot-2", b(0, -414, 515, 360, 12, 12).color(steel));
p.part("battery-vent-slot-3", b(0, -414, 560, 360, 12, 12).color(steel));
p.part("battery-vent-slot-4", b(0, -414, 605, 360, 12, 12).color(steel));

return p.model();
