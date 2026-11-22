// SPDX-License-Identifier: CC0-1.0
// Ellipsoidal reflector spotlight: Theatre profile fixture with a horizontal barrel, forward-facing lens, rear housing, yoke and focus control.

meta({
  name: "ellipsoidal-reflector-spotlight",
  license: 'CC0-1.0',
  title: "Ellipsoidal reflector spotlight",
  description: "Theatre profile fixture with a horizontal barrel, forward-facing lens, rear housing, yoke and focus control. Knobs: overall scale; powder-coated steel, aluminum, steel hardware, lens and display glass; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "center",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#353b41', { label: 'Powder-coated steel' });
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const glass = param('glass', '#f3e9bf', { label: 'Lens and display glass' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    aluminum: '#c7cecf',
    hardware: '#c5a052',
    glass: '#ffd15d',
  },
  touring: {
    powderCoat: '#315465',
    aluminum: '#dce3e2',
    hardware: '#e2b347',
    glass: '#31b9d2',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("ellipsoidal-reflector-spotlight");
p.part("rear-housing", b(0,0,100,300,340,280).color(powderCoat));
p.part("barrel", cy(0,30,240,540,95,10).color(aluminum));
p.part("front-shutter-top", b(0,-520,330,220,40,100).color(powderCoat));
p.part("front-shutter-left", b(-100,-520,210,40,40,180).color(powderCoat));
p.part("front-shutter-right", b(100,-520,210,40,40,180).color(powderCoat));
p.part("yoke-left", b(-210,0,0,45,55,380).color(hardware));
p.part("yoke-right", b(210,0,0,45,55,380).color(hardware));
p.part("yoke-crossbar", b(0,0,45,420,55,55).color(hardware));
p.part("focus-knob", c(215,0,260,90,48,10).color(powderCoat));
p.part("stirrup-eye", c(0,0,380,100,38,10).color(hardware));
p.part("lens-rim", cy(0,-500,240,70,113,10).color(glass));
p.part("lens", cy(0,-510,240,50,88,10).color(glass));



return p.model();
