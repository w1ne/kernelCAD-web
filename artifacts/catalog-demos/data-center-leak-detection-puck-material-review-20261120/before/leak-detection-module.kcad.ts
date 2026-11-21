// SPDX-License-Identifier: CC0-1.0
// Leak detection module: Water-leak monitor enclosure with probe terminals and floor sensor puck.

meta({
  name: "leak-detection-module",
  license: 'CC0-1.0',
  title: "Leak detection module",
  description: "Water-leak monitor enclosure with probe terminals and floor sensor puck. Knobs: overall scale; painted steel, engineering polymer, rubber and elastomer. Presets: facilityStandard and highVisibility.",
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>cylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("leak-detection-module");
p.part("monitor-box", b(0, 0, 0, 460, 300, 250).color(steel));
p.part("control-face", b(0, -160, 40, 400, 24, 170).color(polymer));
p.part("probe-terminal-left", c(-120, -190, 130, 65, 30, 8).color(steel));
p.part("probe-terminal-right", c(120, -190, 130, 65, 30, 8).color(steel));
p.part("floor-sensor-puck", b(420, 0, 0, 180, 180, 40).color(steel));
p.part("sensor-cable", hy(250, 0, 25, 500, 14, 8).color(rubber));

return p.model();
