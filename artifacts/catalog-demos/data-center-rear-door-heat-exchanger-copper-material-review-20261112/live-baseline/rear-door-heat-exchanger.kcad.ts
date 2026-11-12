// SPDX-License-Identifier: CC0-1.0
// Rear-door heat exchanger: Rack-door cooling frame with serpentine-look tube runs and inlet connections.

meta({
  name: "rear-door-heat-exchanger",
  license: 'CC0-1.0',
  title: "Rear-door heat exchanger",
  description: "Rack-door cooling frame with serpentine-look tube runs and inlet connections. Knobs: overall scale; painted steel, engineering polymer. Presets: facilityStandard and highVisibility.",
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("rear-door-heat-exchanger");
p.part("door-frame", b(0, 0, 0, 760, 110, 2100).color(steel));
p.part("heat-exchanger-panel", b(0, -80, 160, 660, 55, 1760).color(steel));
p.part("tube-run-0", hy(0, -120, 260, 610, 22, 8).color(steel));
p.part("tube-run-1", hy(0, -120, 440, 610, 22, 8).color(steel));
p.part("tube-run-2", hy(0, -120, 620, 610, 22, 8).color(steel));
p.part("tube-run-3", hy(0, -120, 800, 610, 22, 8).color(steel));
p.part("tube-run-4", hy(0, -120, 980, 610, 22, 8).color(steel));
p.part("tube-run-5", hy(0, -120, 1160, 610, 22, 8).color(steel));
p.part("tube-run-6", hy(0, -120, 1340, 610, 22, 8).color(steel));
p.part("tube-run-7", hy(0, -120, 1520, 610, 22, 8).color(steel));
p.part("tube-run-8", hy(0, -120, 1700, 610, 22, 8).color(steel));
p.part("hinge-left", b(-410, 0, 150, 65, 160, 1750).color(steel));
p.part("hinge-right", b(410, 0, 150, 65, 160, 1750).color(steel));
p.part("inlet-port", c(-300, 0, 80, 140, 55, 10).color(steel));
p.part("outlet-port", c(300, 0, 80, 140, 55, 10).color(polymer));

return p.model();
