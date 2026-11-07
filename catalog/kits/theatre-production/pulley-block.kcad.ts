// SPDX-License-Identifier: CC0-1.0
// Pulley block: Single-sheave block with side cheeks, top attachment eye and lower rope slot.

meta({
  name: "pulley-block",
  license: 'CC0-1.0',
  title: "Pulley block",
  description: "Single-sheave block with side cheeks, top attachment eye and lower rope slot. Knobs: overall scale; painted steel, galvanized steel, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const paintedSteel = param('paintedSteel', '#454d54', { label: 'Painted steel' });
const galvanizedSteel = param('galvanizedSteel', '#aab5b9', { label: 'Galvanized steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    galvanizedSteel: '#c0c8ca',
    hardware: '#c5a052',
  },
  touring: {
    paintedSteel: '#dda21f',
    galvanizedSteel: '#dce2e2',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("pulley-block");
p.part("cheek-left", b(-95,0,0,45,130,280).color(paintedSteel));
p.part("cheek-right", b(95,0,0,45,130,280).color(paintedSteel));
p.part("top-crossbar", b(0,0,250,200,130,55).color(galvanizedSteel));
p.part("bottom-crossbar", b(0,0,0,200,130,55).color(galvanizedSteel));
p.part("rope-slot-left", b(-70,-70,25,60,28,120).color(galvanizedSteel));
p.part("rope-slot-right", b(70,-70,25,60,28,120).color(galvanizedSteel));
p.part("sheave", c(0,0,65,165,95,10).color(galvanizedSteel));
p.part("axle", c(0,0,0,260,28,10).color(hardware));
p.part("attachment-eye", c(0,0,305,95,48,10).color(hardware));



return p.model();
