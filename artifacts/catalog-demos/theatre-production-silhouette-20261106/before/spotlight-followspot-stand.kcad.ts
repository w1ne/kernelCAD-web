// SPDX-License-Identifier: CC0-1.0
// Followspot stand: Tall followspot support with a weighted base, height mast, yoke saddle and paired adjustment knobs.

meta({
  name: "spotlight-followspot-stand",
  license: 'CC0-1.0',
  title: "Followspot stand",
  description: "Tall followspot support with a weighted base, height mast, yoke saddle and paired adjustment knobs. Knobs: overall scale; powder-coated steel, steel hardware; houseShow and touring appearance presets.",
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

const p = assembly("spotlight-followspot-stand");
p.part("base", b(0,0,0,800,650,95).color(powderCoat));
p.part("mast", b(0,0,95,95,95,1150).color(powderCoat));
p.part("crosshead", b(0,0,1245,430,150,100).color(powderCoat));
p.part("left-yoke", b(-180,0,1245,55,90,350).color(hardware));
p.part("right-yoke", b(180,0,1245,55,90,350).color(hardware));
p.part("saddle", b(0,0,1580,300,270,80).color(powderCoat));
p.part("height-collar", c(0,0,1110,115,66,10).color(powderCoat));
p.part("left-adjuster", c(-230,0,1370,90,46,10).color(powderCoat));
p.part("right-adjuster", c(230,0,1370,90,46,10).color(powderCoat));



return p.model();
