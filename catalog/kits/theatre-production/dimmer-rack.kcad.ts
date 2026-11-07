// SPDX-License-Identifier: CC0-1.0
// Dimmer rack: Portable lighting-control rack with vented front panel, breaker rows and top cable tray.

meta({
  name: "dimmer-rack",
  license: 'CC0-1.0',
  title: "Dimmer rack",
  description: "Portable lighting-control rack with vented front panel, breaker rows and top cable tray. Knobs: overall scale; powder-coated steel, lens and display glass; houseShow and touring appearance presets.",
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

presets({
  houseShow: {
    powderCoat: '#272d33',
    glass: '#ffd15d',
  },
  touring: {
    powderCoat: '#315465',
    glass: '#31b9d2',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dimmer-rack");
p.part("base", b(0,0,0,800,720,90).color(powderCoat));
p.part("left-upright", b(-350,0,90,55,680,1550).color(powderCoat));
p.part("right-upright", b(350,0,90,55,680,1550).color(powderCoat));
p.part("top-panel", b(0,0,1640,800,720,90).color(powderCoat));
p.part("front-panel", b(0,-330,180,650,45,1330).color(powderCoat));
p.part("vent-low", b(0,-360,470,420,18,26).color(powderCoat));
p.part("vent-mid", b(0,-360,570,420,18,26).color(powderCoat));
p.part("vent-high", b(0,-360,670,420,18,26).color(powderCoat));
p.part("cable-tray", b(0,340,1440,760,90,120).color(powderCoat));
p.part("wheel-left", c(-300,-260,0,125,48,10).color(powderCoat));
p.part("wheel-right", c(300,-260,0,125,48,10).color(powderCoat));
p.part("indicator", c(245,-370,1280,70,25,10).color(glass));



return p.model();
