// SPDX-License-Identifier: CC0-1.0
// Fresnel wash fixture: Compact Fresnel wash luminaire with a broad lens rim, rear vent body, yoke and clamp spigot.

meta({
  name: "fresnel-wash-fixture",
  license: 'CC0-1.0',
  title: "Fresnel wash fixture",
  description: "Compact Fresnel wash luminaire with a broad lens rim, rear vent body, yoke and clamp spigot. Knobs: overall scale; powder-coated steel, steel hardware, aluminum, lens and display glass; houseShow and touring appearance presets.",
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
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const glass = param('glass', '#f3e9bf', { label: 'Lens and display glass' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    hardware: '#c5a052',
    aluminum: '#c7cecf',
    glass: '#ffd15d',
  },
  touring: {
    powderCoat: '#315465',
    hardware: '#e2b347',
    aluminum: '#dce3e2',
    glass: '#31b9d2',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("fresnel-wash-fixture");
p.part("rear-case", b(0,0,250,300,300,300).color(powderCoat));
p.part("side-plate-left", b(-170,0,320,50,350,260).color(powderCoat));
p.part("side-plate-right", b(170,0,320,50,350,260).color(powderCoat));
p.part("yoke-arm-left", b(-220,0,145,45,55,360).color(hardware));
p.part("yoke-arm-right", b(220,0,145,45,55,360).color(hardware));
p.part("yoke-crossbar", b(0,0,500,470,55,55).color(hardware));
p.part("spigot", b(0,0,0,90,90,150).color(hardware));
p.part("barrel", c(0,0,430,250,125,10).color(aluminum));
p.part("lens-rim", c(0,0,680,145,150,10).color(glass));
p.part("focus-handle", c(0,-190,450,160,28,10).color(hardware));



return p.model();
