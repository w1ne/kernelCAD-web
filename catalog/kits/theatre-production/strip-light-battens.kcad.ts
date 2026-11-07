// SPDX-License-Identifier: CC0-1.0
// Strip-light batten set: Three compact strip-light housings with mounting tabs and end caps, arranged as a touring set.

meta({
  name: "strip-light-battens",
  license: 'CC0-1.0',
  title: "Strip-light batten set",
  description: "Three compact strip-light housings with mounting tabs and end caps, arranged as a touring set. Knobs: overall scale; powder-coated steel, lens and display glass, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#353b41', { label: 'Powder-coated steel' });
const glass = param('glass', '#f3e9bf', { label: 'Lens and display glass' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    glass: '#ffd15d',
    hardware: '#c5a052',
  },
  touring: {
    powderCoat: '#315465',
    glass: '#31b9d2',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("strip-light-battens");
p.part("batten-one", b(0,-430,0,1500,150,120).color(powderCoat));
p.part("batten-two", b(0,0,0,1500,150,120).color(powderCoat));
p.part("batten-three", b(0,430,0,1500,150,120).color(powderCoat));
p.part("lens-one", b(0,-430,120,1420,110,42).color(glass));
p.part("lens-two", b(0,0,120,1420,110,42).color(glass));
p.part("lens-three", b(0,430,120,1420,110,42).color(glass));
p.part("tab-left-one", b(-680,-430,0,90,180,45).color(hardware));
p.part("tab-right-one", b(680,-430,0,90,180,45).color(hardware));
p.part("tab-left-two", b(-680,0,0,90,180,45).color(hardware));
p.part("tab-right-two", b(680,0,0,90,180,45).color(hardware));
p.part("hanger-left", c(-600,0,165,115,24,10).color(hardware));
p.part("hanger-right", c(600,0,165,115,24,10).color(hardware));



return p.model();
