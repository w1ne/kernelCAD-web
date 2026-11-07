// SPDX-License-Identifier: CC0-1.0
// Maintenance bypass cabinet: Bypass switchboard cabinet with a guarded rotary bypass handle, paired source paths, and an interlock panel.

meta({
  name: "maintenance-bypass-cabinet",
  license: 'CC0-1.0',
  title: "Maintenance bypass cabinet",
  description: "Bypass switchboard cabinet with a guarded rotary bypass handle, paired source paths, and an interlock panel. Knobs: overall scale; painted steel, engineering polymer, glass and display lenses, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("maintenance-bypass-cabinet");
p.part("base-plinth", b(0, 0, 0, 930, 850, 100).color(steel));
p.part("cabinet-shell", b(0, 0, 100, 850, 780, 1700).color(steel));
p.part("front-door", b(0, -405.0, 165, 760, 30, 1580).color(steel));
p.part("operator-display", b(-229.50000000000003, -422.0, 1296.0, 155, 24, 115).color(glass));
p.part("door-handle", b(306.0, -418.0, 774.0, 35, 30, 260).color(polymer));
p.part("control-knob", c(-229.50000000000003, -446.0, 1152.0, 38, 22, 8).color(polymer));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(rubber));
p.part("bypass-interlock-panel", b(0, -414, 825, 430, 24, 390).color(steel));
p.part("rotary-bypass-selector", c(0, -460, 720, 70, 68, 10).color(polymer));
p.part("bypass-selector-handle", b(0, -493, 790, 175, 24, 28).color(polymer));
p.part("utility-path-bar", b(-220, -430, 1310, 360, 22, 35).color(steel));
p.part("bypass-path-bar", b(220, -430, 1310, 360, 22, 35).color(steel));

return p.model();
