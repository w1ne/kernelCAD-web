// SPDX-License-Identifier: CC0-1.0
// Cable ramp crossing: Low stage-floor cable cover with a central raceway, sloped shoulders and two end guards.

meta({
  name: "cable-ramp-crossing",
  license: 'CC0-1.0',
  title: "Cable ramp crossing",
  description: "Low stage-floor cable cover with a central raceway, sloped shoulders and two end guards. Knobs: overall scale; polymer controls and cable jacket, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    polymer: '#344e5b',
    hardware: '#c5a052',
  },
  touring: {
    polymer: '#e3a928',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("cable-ramp-crossing");
p.part("base", b(0,0,0,1200,360,55).color(polymer));
p.part("center-raceway", b(0,0,55,1200,170,95).color(polymer));
p.part("left-shoulder", b(-480,0,55,240,360,70).color(polymer));
p.part("right-shoulder", b(480,0,55,240,360,70).color(polymer));
p.part("top-cover", b(0,0,150,1200,160,45).color(polymer));
p.part("end-guard-left", b(-580,0,0,40,380,155).color(polymer));
p.part("end-guard-right", b(580,0,0,40,380,155).color(polymer));
p.part("hinge-strip", b(0,-95,155,1200,35,30).color(hardware));
p.part("anchor-left", c(-500,0,0,75,30,10).color(polymer));
p.part("anchor-right", c(500,0,0,75,30,10).color(polymer));



return p.model();
