// SPDX-License-Identifier: CC0-1.0
// Riser cart: Rolling cart with stacked folding platform sections, end guards and a tall pull handle.

meta({
  name: "riser-cart",
  license: 'CC0-1.0',
  title: "Riser cart",
  description: "Rolling cart with stacked folding platform sections, end guards and a tall pull handle. Knobs: overall scale; polymer controls and cable jacket, steel hardware, aluminum, rubber and isolation pads; houseShow and touring appearance presets.",
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
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    polymer: '#344e5b',
    hardware: '#c5a052',
    aluminum: '#c7cecf',
    rubber: '#222629',
  },
  touring: {
    polymer: '#e3a928',
    hardware: '#e2b347',
    aluminum: '#dce3e2',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("riser-cart");
p.part("lower-platform", b(0,0,180,1050,650,70).color(polymer));
p.part("middle-platform", b(0,0,270,1050,650,70).color(polymer));
p.part("upper-platform", b(0,0,360,1050,650,70).color(polymer));
p.part("front-stop", b(0,-310,430,1000,45,120).color(polymer));
p.part("back-stop", b(0,310,430,1000,45,120).color(polymer));
p.part("handle-left", b(-450,250,130,55,55,1000).color(hardware));
p.part("handle-right", b(450,250,130,55,55,1000).color(hardware));
p.part("handle-top", b(0,250,1130,930,55,55).color(hardware));
p.part("side-rail-left", b(-500,0,220,45,600,70).color(aluminum));
p.part("side-rail-right", b(500,0,220,45,600,70).color(aluminum));
p.part("wheel-a", c(-440,-260,0,170,58,10).color(rubber));
p.part("wheel-b", c(440,-260,0,170,58,10).color(rubber));
p.part("wheel-c", c(-440,260,0,170,58,10).color(rubber));
p.part("wheel-d", c(440,260,0,170,58,10).color(rubber));



return p.model();
