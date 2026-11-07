// SPDX-License-Identifier: CC0-1.0
// Stage power distribution box: Portable stage power enclosure with locking lid, connector rows, carry handles and skid feet.

meta({
  name: "stage-power-distro",
  license: 'CC0-1.0',
  title: "Stage power distribution box",
  description: "Portable stage power enclosure with locking lid, connector rows, carry handles and skid feet. Knobs: overall scale; powder-coated steel, steel hardware, polymer controls and cable jacket; houseShow and touring appearance presets.",
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
const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    hardware: '#c5a052',
    polymer: '#344e5b',
  },
  touring: {
    powderCoat: '#315465',
    hardware: '#e2b347',
    polymer: '#e3a928',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-power-distro");
p.part("case", b(0,0,80,850,620,820).color(powderCoat));
p.part("lid", b(0,0,900,880,650,80).color(powderCoat));
p.part("front-panel", b(0,-315,260,740,35,480).color(powderCoat));
p.part("panel-left", b(-310,-340,340,100,35,320).color(powderCoat));
p.part("panel-right", b(310,-340,340,100,35,320).color(powderCoat));
p.part("handle-left", b(-470,0,390,80,100,55).color(hardware));
p.part("handle-right", b(470,0,390,80,100,55).color(hardware));
p.part("skid-left", b(-280,0,0,100,580,80).color(powderCoat));
p.part("skid-right", b(280,0,0,100,580,80).color(powderCoat));
p.part("connector-a", c(-230,-365,190,120,40,10).color(polymer));
p.part("connector-b", c(0,-365,190,120,40,10).color(polymer));
p.part("connector-c", c(230,-365,190,120,40,10).color(polymer));



return p.model();
