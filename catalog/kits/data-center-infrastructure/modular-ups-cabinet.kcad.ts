// SPDX-License-Identifier: CC0-1.0
// Modular UPS cabinet: Modular UPS cabinet with removable power-module drawers, a service display, ventilation louvers, and a separated base plinth.

meta({
  name: "modular-ups-cabinet",
  license: 'CC0-1.0',
  title: "Modular UPS cabinet",
  description: "Modular UPS cabinet with removable power-module drawers, a service display, ventilation louvers, and a separated base plinth. Knobs: overall scale; painted steel, engineering polymer, glass and display lenses, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("modular-ups-cabinet");
p.part("base-plinth", b(0, 0, 0, 1020, 790, 100).color(steel));
p.part("cabinet-shell", b(0, 0, 100, 940, 720, 1580).color(steel));
p.part("operator-display", b(-253.8, -392.0, 1209.6, 155, 24, 115).color(glass));
p.part("door-handle", b(338.4, -388.0, 722.4, 35, 30, 260).color(polymer));
p.part("control-knob", c(-253.8, -416.0, 1075.2, 38, 22, 8).color(polymer));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(rubber));
p.part("power-module-drawer-0", b(-245, -390, 220, 148, 34, 205).color(polymer));
p.part("power-module-drawer-1", b(-82, -390, 220, 148, 34, 205).color(polymer));
p.part("power-module-drawer-2", b(81, -390, 220, 148, 34, 205).color(polymer));
p.part("power-module-drawer-0", b(-245, -390, 485, 148, 34, 205).color(polymer));
p.part("power-module-drawer-1", b(-82, -390, 485, 148, 34, 205).color(polymer));
p.part("power-module-drawer-2", b(81, -390, 485, 148, 34, 205).color(polymer));
p.part("power-module-drawer-0", b(-245, -390, 750, 148, 34, 205).color(polymer));
p.part("power-module-drawer-1", b(-82, -390, 750, 148, 34, 205).color(polymer));
p.part("power-module-drawer-2", b(81, -390, 750, 148, 34, 205).color(polymer));
p.part("power-module-drawer-0", b(-245, -390, 1015, 148, 34, 205).color(polymer));
p.part("power-module-drawer-1", b(-82, -390, 1015, 148, 34, 205).color(polymer));
p.part("power-module-drawer-2", b(81, -390, 1015, 148, 34, 205).color(polymer));
p.part("module-release-grip-0", b(-245, -414, 300, 72, 14, 22).color(steel));
p.part("module-release-grip-1", b(-82, -414, 300, 72, 14, 22).color(steel));
p.part("module-release-grip-2", b(81, -414, 300, 72, 14, 22).color(steel));

return p.model();
