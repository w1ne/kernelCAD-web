// SPDX-License-Identifier: CC0-1.0
// Busway plug-in unit: Compact plug-in tap box with operating handle and cable outlet gland.

meta({
  name: "busway-plug-in-unit",
  license: 'CC0-1.0',
  title: "Busway plug-in unit",
  description: "Compact plug-in tap box with operating handle and cable outlet gland. Knobs: overall scale; painted steel, engineering polymer, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("busway-plug-in-unit");
p.part("tap-box", b(0, 0, 0, 300, 280, 460).color(steel));
p.part("cover", b(0, -150, 25, 255, 35, 405).color(steel));
p.part("handle", b(0, -205, 250, 90, 85, 40).color(polymer));
p.part("cable-gland", c(0, 0, 0, 80, 55, 10).color(rubber));
p.part("interlock-knob", c(90, -205, 235, 36, 18, 8).color(polymer));

return p.model();
