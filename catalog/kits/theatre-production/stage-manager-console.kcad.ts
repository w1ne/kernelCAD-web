// SPDX-License-Identifier: CC0-1.0
// Stage manager console: Compact backstage work surface with a call-board screen, talkback controls and cable trunk.

meta({
  name: "stage-manager-console",
  license: 'CC0-1.0',
  title: "Stage manager console",
  description: "Compact backstage work surface with a call-board screen, talkback controls and cable trunk. Knobs: overall scale; steel hardware, powder-coated steel, lens and display glass, polymer controls and cable jacket; houseShow and touring appearance presets.",
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

const p = assembly("stage-manager-console");
p.part("console-base", b(0,0,0,1050,620,110).color(hardware));
p.part("desk-top", b(0,0,740,1050,620,80).color(powderCoat));
p.part("left-leg", b(-450,230,110,60,60,630).color(hardware));
p.part("right-leg", b(450,230,110,60,60,630).color(hardware));
p.part("rear-post-left", b(-450,230,740,60,60,570).color(hardware));
p.part("rear-post-right", b(450,230,740,60,60,570).color(hardware));
p.part("monitor", b(0,200,820,520,100,380).color(glass));
p.part("call-board", b(0,260,1220,720,60,470).color(powderCoat));
p.part("lower-shelf", b(0,200,320,880,240,50).color(powderCoat));
p.part("talkback-knob-left", c(-320,-190,825,70,38,10).color(polymer));
p.part("talkback-knob-right", c(320,-190,825,70,38,10).color(polymer));



return p.model();
