// SPDX-License-Identifier: CC0-1.0
// Floor cable trough: Open-top cable trough section with removable lid strips, sidewalls and joining flanges.

meta({
  name: "floor-cable-trough",
  license: 'CC0-1.0',
  title: "Floor cable trough",
  description: "Open-top cable trough section with removable lid strips, sidewalls and joining flanges. Knobs: overall scale; polymer controls and cable jacket, aluminum, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    polymer: '#344e5b',
    aluminum: '#c7cecf',
    hardware: '#c5a052',
  },
  touring: {
    polymer: '#e3a928',
    aluminum: '#dce3e2',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("floor-cable-trough");
p.part("floor", b(0,0,0,1500,360,45).color(polymer));
p.part("wall-left", b(0,-160,45,1500,40,180).color(polymer));
p.part("wall-right", b(0,160,45,1500,40,180).color(polymer));
p.part("lid-left", b(0,-88,225,730,100,38).color(polymer));
p.part("lid-right", b(0,88,225,730,100,38).color(polymer));
p.part("splice-plate-left", b(-760,0,0,60,400,230).color(polymer));
p.part("splice-plate-right", b(760,0,0,60,400,230).color(polymer));
p.part("support-crossbar", b(0,0,110,1450,50,45).color(aluminum));
p.part("join-pin-left", c(-730,0,0,75,22,10).color(hardware));
p.part("join-pin-right", c(730,0,0,75,22,10).color(hardware));



return p.model();
