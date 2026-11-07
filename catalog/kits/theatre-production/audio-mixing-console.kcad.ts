// SPDX-License-Identifier: CC0-1.0
// Audio mixing console: Portable audio desk with a sloped control panel, display bridge, channel fader strips and rack base.

meta({
  name: "audio-mixing-console",
  license: 'CC0-1.0',
  title: "Audio mixing console",
  description: "Portable audio desk with a sloped control panel, display bridge, channel fader strips and rack base. Knobs: overall scale; steel hardware, powder-coated steel, lens and display glass, polymer controls and cable jacket; houseShow and touring appearance presets.",
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

const p = assembly("audio-mixing-console");
p.part("base", b(0,0,0,1200,780,180).color(hardware));
p.part("sloped-panel", b(0,0,180,1160,730,180).color(powderCoat));
p.part("display-bridge", b(0,270,360,1120,150,70).color(glass));
p.part("display-left", b(-250,240,430,350,40,220).color(glass));
p.part("display-right", b(250,240,430,350,40,220).color(glass));
p.part("fader-bank-left", b(-390,-220,350,300,280,45).color(polymer));
p.part("fader-bank-right", b(390,-220,350,300,280,45).color(polymer));
p.part("arm-rest", b(0,-385,220,1120,70,65).color(hardware));
p.part("encoder-left", c(-430,-100,390,55,25,10).color(polymer));
p.part("encoder-mid", c(0,-100,390,55,25,10).color(polymer));
p.part("encoder-right", c(430,-100,390,55,25,10).color(polymer));



return p.model();
