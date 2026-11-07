// SPDX-License-Identifier: CC0-1.0
// LED cyc wash light: Low-profile cyclorama wash unit with a long lens window, end cheeks and floor-bounce feet.

meta({
  name: "led-cyc-wash-light",
  license: 'CC0-1.0',
  title: "LED cyc wash light",
  description: "Low-profile cyclorama wash unit with a long lens window, end cheeks and floor-bounce feet. Knobs: overall scale; powder-coated steel, lens and display glass, steel hardware; houseShow and touring appearance presets.",
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

const p = assembly("led-cyc-wash-light");
p.part("housing", b(0,0,0,1300,280,250).color(powderCoat));
p.part("front-window", b(0,-145,85,1120,25,130).color(glass));
p.part("top-grille", b(0,0,250,1280,250,35).color(powderCoat));
p.part("end-left", b(-640,0,0,35,300,255).color(powderCoat));
p.part("end-right", b(640,0,0,35,300,255).color(powderCoat));
p.part("foot-left", b(-500,0,0,120,340,80).color(hardware));
p.part("foot-right", b(500,0,0,120,340,80).color(hardware));
p.part("lens-a", c(-430,-155,80,150,42,10).color(glass));
p.part("lens-b", c(0,-155,80,150,42,10).color(glass));
p.part("lens-c", c(430,-155,80,150,42,10).color(glass));
p.part("cable-entry", c(520,120,125,85,28,10).color(powderCoat));



return p.model();
