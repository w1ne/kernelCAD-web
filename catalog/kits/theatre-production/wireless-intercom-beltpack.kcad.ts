// SPDX-License-Identifier: CC0-1.0
// Wireless intercom beltpack: Portable communications pack with antenna, belt clip, talk button and headset socket.

meta({
  name: "wireless-intercom-beltpack",
  license: 'CC0-1.0',
  title: "Wireless intercom beltpack",
  description: "Portable communications pack with antenna, belt clip, talk button and headset socket. Knobs: overall scale; powder-coated steel, steel hardware, polymer controls and cable jacket; houseShow and touring appearance presets.",
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

const p = assembly("wireless-intercom-beltpack");
p.part("pack-body", b(0,0,0,220,115,350).color(powderCoat));
p.part("belt-clip", b(0,65,10,100,30,250).color(hardware));
p.part("top-cap", b(0,0,350,230,125,50).color(powderCoat));
p.part("side-button", b(120,0,200,35,70,70).color(polymer));
p.part("front-label", b(0,-60,130,150,22,100).color(powderCoat));
p.part("antenna-base", b(70,0,395,40,40,65).color(polymer));
p.part("antenna", c(70,0,460,220,12,10).color(polymer));
p.part("talk-button", c(-50,-75,310,70,30,10).color(polymer));
p.part("headset-socket", c(-110,-20,30,75,32,10).color(polymer));



return p.model();
