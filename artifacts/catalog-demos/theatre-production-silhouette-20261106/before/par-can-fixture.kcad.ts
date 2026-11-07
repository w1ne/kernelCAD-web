// SPDX-License-Identifier: CC0-1.0
// PAR can fixture: Compact PAR-style can with a cylindrical lamp body, lens rim, side yoke and clamp spigot.

meta({
  name: "par-can-fixture",
  license: 'CC0-1.0',
  title: "PAR can fixture",
  description: "Compact PAR-style can with a cylindrical lamp body, lens rim, side yoke and clamp spigot. Knobs: overall scale; steel hardware, powder-coated steel, aluminum, lens and display glass; houseShow and touring appearance presets.",
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
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const glass = param('glass', '#f3e9bf', { label: 'Lens and display glass' });

presets({
  houseShow: {
    hardware: '#c5a052',
    powderCoat: '#272d33',
    aluminum: '#c7cecf',
    glass: '#ffd15d',
  },
  touring: {
    hardware: '#e2b347',
    powderCoat: '#315465',
    aluminum: '#dce3e2',
    glass: '#31b9d2',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("par-can-fixture");
p.part("yoke-left", b(-185,0,80,45,55,350).color(hardware));
p.part("yoke-right", b(185,0,80,45,55,350).color(hardware));
p.part("yoke-crossbar", b(0,0,390,400,55,55).color(hardware));
p.part("spigot", b(0,0,445,90,90,150).color(hardware));
p.part("lamp-door-tab", b(0,-125,135,70,40,75).color(hardware));
p.part("side-bolt-left", b(-205,0,215,50,60,60).color(hardware));
p.part("side-bolt-right", b(205,0,215,50,60,60).color(hardware));
p.part("can-body", c(0,0,60,460,165,10).color(powderCoat));
p.part("front-rim", c(0,0,510,80,178,10).color(aluminum));
p.part("lens", c(0,0,590,45,150,10).color(glass));
p.part("rear-cap", c(0,0,0,75,142,10).color(powderCoat));



return p.model();
