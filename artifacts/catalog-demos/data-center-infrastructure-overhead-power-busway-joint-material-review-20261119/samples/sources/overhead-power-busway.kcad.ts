// SPDX-License-Identifier: CC0-1.0
// Overhead power busway: Enclosed busway segment with joined covers, hanger brackets, and end caps.

meta({
  name: "overhead-power-busway",
  license: 'CC0-1.0',
  title: "Overhead power busway",
  description: "Enclosed busway segment with joined covers, hanger brackets, and end caps. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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

const p=assembly("overhead-power-busway");
p.part("busway-housing", b(0, 0, 0, 2400, 180, 210).color(steel));
p.part("cover-joint-0", b(-900, 0, 210, 55, 205, 24).color(polymer));
p.part("cover-joint-1", b(-300, 0, 210, 55, 205, 24).color(steel));
p.part("cover-joint-2", b(300, 0, 210, 55, 205, 24).color(steel));
p.part("cover-joint-3", b(900, 0, 210, 55, 205, 24).color(steel));
p.part("end-cap-left", b(-1220, 0, 15, 70, 210, 180).color(steel));
p.part("end-cap-right", b(1220, 0, 15, 70, 210, 180).color(steel));
p.part("hanger", b(0, 0, 210, 90, 560, 250).color(steel));
p.part("hanger-bolt", c(0, 0, 440, 90, 24, 8).color(steel));

return p.model();
