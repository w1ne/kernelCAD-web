// SPDX-License-Identifier: CC0-1.0
// Automatic transfer switch cabinet: Transfer cabinet with utility and generator status windows, a central transfer control, and a lower cable plate.

meta({
  name: "automatic-transfer-switch-cabinet",
  license: 'CC0-1.0',
  title: "Automatic transfer switch cabinet",
  description: "Transfer cabinet with utility and generator status windows, a central transfer control, and a lower cable plate. Knobs: overall scale; painted steel, engineering polymer, glass and display lenses, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("automatic-transfer-switch-cabinet");
p.part("base-plinth", b(0, 0, 0, 1020, 850, 100).color(steel));
p.part("cabinet-shell", b(0, 0, 100, 940, 780, 1700).color(steel));
p.part("front-door", b(0, -405.0, 165, 850, 30, 1580).color(steel));
p.part("operator-display", b(-253.8, -422.0, 1296.0, 155, 24, 115).color(glass));
p.part("door-handle", b(338.4, -418.0, 774.0, 35, 30, 260).color(polymer));
p.part("control-knob", c(-253.8, -446.0, 1152.0, 38, 22, 8).color(polymer));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(rubber));
p.part("utility-source-window", b(-180, -414, 1090, 190, 18, 95).color(glass));
p.part("generator-source-window", b(180, -414, 1090, 190, 18, 95).color(glass));
p.part("transfer-control", c(0, -460, 840, 48, 40, 10).color(polymer));

return p.model();
