// SPDX-License-Identifier: CC0-1.0
// Static transfer switch: Transfer cabinet with two source indicators, paired operator controls, a service display, and a transfer handle.

meta({
  name: "static-transfer-switch",
  license: 'CC0-1.0',
  title: "Static transfer switch",
  description: "Transfer cabinet with two source indicators, paired operator controls, a service display, and a transfer handle. Knobs: overall scale; painted steel, engineering polymer, glass and display lenses, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("static-transfer-switch");
p.part("base-plinth", b(0, 0, 0, 840, 790, 100).color(steel));
p.part("cabinet-shell", b(0, 0, 100, 760, 720, 1580).color(steel));
p.part("front-door", b(0, -375.0, 165, 670, 30, 1460).color(steel));
p.part("operator-display", b(-205.20000000000002, -392.0, 1209.6, 155, 24, 115).color(glass));
p.part("door-handle", b(273.59999999999997, -388.0, 722.4, 35, 30, 260).color(polymer));
p.part("control-knob", c(-205.20000000000002, -416.0, 1075.2, 38, 22, 8).color(polymer));
p.part("cable-entry", c(0, 0, 0, 70, 42, 10).color(rubber));
p.part("utility-source-indicator", c(-175, -465, 1010, 36, 28, 8).color(glass));
p.part("generator-source-indicator", c(175, -465, 1010, 36, 28, 8).color(glass));
p.part("transfer-handle", b(0, -473, 680, 105, 26, 180).color(polymer));

return p.model();
