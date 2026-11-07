// SPDX-License-Identifier: CC0-1.0
// Lighting control console: Theatre lighting desk with two display hoods, angled control surface, key bays and side cheeks.

meta({
  name: "lighting-control-console",
  license: 'CC0-1.0',
  title: "Lighting control console",
  description: "Theatre lighting desk with two display hoods, angled control surface, key bays and side cheeks. Knobs: overall scale; steel hardware, powder-coated steel, lens and display glass, polymer controls and cable jacket; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const powderCoat = param('powderCoat', '#353b41', { label: 'Powder-coated steel' });
const glass = param('glass', '#f3e9bf', { label: 'Lens and display glass' });
const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });

presets({
  houseShow: {
    hardware: '#c5a052',
    powderCoat: '#272d33',
    glass: '#ffd15d',
    polymer: '#344e5b',
  },
  touring: {
    hardware: '#e2b347',
    powderCoat: '#315465',
    glass: '#31b9d2',
    polymer: '#e3a928',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("lighting-control-console");
p.part("console-base", b(0,0,0,1200,720,180).color(hardware));
p.part("control-surface", b(0,-30,180,1180,680,230).color(powderCoat));
p.part("left-cheek", b(-570,0,180,65,700,430).color(powderCoat));
p.part("right-cheek", b(570,0,180,65,700,430).color(powderCoat));
p.part("left-display", b(-280,150,420,380,160,300).color(glass));
p.part("right-display", b(280,150,420,380,160,300).color(glass));
p.part("keyboard-panel", b(0,-280,420,420,170,55).color(powderCoat));
p.part("fader-bank-left", b(-390,-240,420,250,180,55).color(polymer));
p.part("fader-bank-right", b(390,-240,420,250,180,55).color(polymer));
p.part("trackball", c(0,-80,400,70,40,10).color(polymer));
p.part("encoder-left", c(-160,-180,445,55,24,10).color(polymer));
p.part("encoder-right", c(160,-180,445,55,24,10).color(polymer));



return p.model();
