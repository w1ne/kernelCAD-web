// SPDX-License-Identifier: CC0-1.0
// Emergency power-off station: Wall-mounted protected control station with actuator and guard hood.

meta({
  name: "emergency-power-off-station",
  license: 'CC0-1.0',
  title: "Emergency power-off station",
  description: "Wall-mounted protected control station with actuator and guard hood. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
  tags: ['data center', 'critical infrastructure', 'IT equipment', 'power', 'cooling', 'scene prop'],
  kit: 'data-center-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['data-center', 'infrastructure', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const steel = param('steel', '#b43b31', { label: 'Painted steel' });
const polymer = param('polymer', '#f0c330', { label: 'Engineering polymer' });

presets({
  facilityStandard: {
    steel: '#b43b31',
    polymer: '#f0c330',
  },
  highVisibility: {
    steel: '#d99b22',
    polymer: '#263e48',
  },
});

const baseZ = 0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("emergency-power-off-station");
p.part("back-plate", b(0, 0, 0, 320, 85, 420).color(steel));
p.part("control-body", b(0, -65, 60, 250, 150, 300).color(polymer));
p.part("guard-hood", b(0, -140, 185, 260, 55, 185).color(steel));
p.part("actuator-base", c(0, -165, 140, 115, 82, 10).color(steel));
p.part("push-button", c(0, -165, 235, 70, 58, 10).color(polymer));
p.part("label-panel", b(0, -155, 325, 220, 28, 46).color(steel));

return p.model();
