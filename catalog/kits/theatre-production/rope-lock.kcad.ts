// SPDX-License-Identifier: CC0-1.0
// Rope lock: Compact rope-line clamp with a backplate, guide jaw, locking handle and mounting pins.

meta({
  name: "rope-lock",
  license: 'CC0-1.0',
  title: "Rope lock",
  description: "Compact rope-line clamp with a backplate, guide jaw, locking handle and mounting pins. Knobs: overall scale; painted steel, rubber and isolation pads, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const paintedSteel = param('paintedSteel', '#454d54', { label: 'Painted steel' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    rubber: '#222629',
    hardware: '#c5a052',
  },
  touring: {
    paintedSteel: '#dda21f',
    rubber: '#25292c',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("rope-lock");
p.part("baseplate", b(0,0,0,320,260,55).color(paintedSteel));
p.part("left-cheek", b(-120,0,55,55,210,320).color(paintedSteel));
p.part("right-cheek", b(120,0,55,55,210,320).color(paintedSteel));
p.part("jaw", b(0,-110,90,190,70,170).color(paintedSteel));
p.part("handle", b(0,0,350,65,65,250).color(paintedSteel));
p.part("grip", b(0,0,600,160,100,70).color(rubber));
p.part("pivot", c(0,0,180,70,35,10).color(hardware));
p.part("mount-pin-left", c(-120,0,0,105,24,10).color(hardware));
p.part("mount-pin-right", c(120,0,0,105,24,10).color(hardware));



return p.model();
