// SPDX-License-Identifier: CC0-1.0
// Backstage call board: Freestanding call-time board with a broad display panel, marker ledge and weighted feet.

meta({
  name: "backstage-call-board",
  license: 'CC0-1.0',
  title: "Backstage call board",
  description: "Freestanding call-time board with a broad display panel, marker ledge and weighted feet. Knobs: overall scale; powder-coated steel, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#353b41', { label: 'Powder-coated steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    hardware: '#c5a052',
  },
  touring: {
    powderCoat: '#315465',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("backstage-call-board");
p.part("panel", b(0,0,850,1050,90,760).color(powderCoat));
p.part("header-strip", b(0,-10,1510,1050,100,100).color(powderCoat));
p.part("left-post", b(-430,0,120,55,55,720).color(hardware));
p.part("right-post", b(430,0,120,55,55,720).color(hardware));
p.part("marker-ledge", b(0,-95,780,1000,150,55).color(powderCoat));
p.part("base-left", b(-430,0,0,240,300,120).color(hardware));
p.part("base-right", b(430,0,0,240,300,120).color(hardware));
p.part("row-line-one", b(0,-55,1260,820,28,28).color(powderCoat));
p.part("row-line-two", b(0,-55,1120,820,28,28).color(powderCoat));
p.part("row-line-three", b(0,-55,980,820,28,28).color(powderCoat));
p.part("magnet-left", c(-340,-65,1260,55,24,10).color(powderCoat));
p.part("magnet-right", c(340,-65,1120,55,24,10).color(powderCoat));



return p.model();
