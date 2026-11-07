// SPDX-License-Identifier: CC0-1.0
// Audio monitor wedge: Low angled stage monitor enclosure with a broad grille, end cheeks and rear connector plate.

meta({
  name: "audio-monitor-wedge",
  license: 'CC0-1.0',
  title: "Audio monitor wedge",
  description: "Low angled stage monitor enclosure with a broad grille, end cheeks and rear connector plate. Knobs: overall scale; powder-coated steel, polymer controls and cable jacket; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const powderCoat = param('powderCoat', '#353b41', { label: 'Powder-coated steel' });
const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });

presets({
  houseShow: {
    powderCoat: '#272d33',
    polymer: '#344e5b',
  },
  touring: {
    powderCoat: '#315465',
    polymer: '#e3a928',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("audio-monitor-wedge");
p.part("speaker-body", b(0,0,0,760,520,240).color(powderCoat));
p.part("front-grille", b(0,-245,120,700,28,200).color(polymer));
p.part("top-panel", b(0,0,240,760,500,55).color(powderCoat));
p.part("left-cheek", b(-365,0,0,35,500,285).color(powderCoat));
p.part("right-cheek", b(365,0,0,35,500,285).color(powderCoat));
p.part("rear-panel", b(0,245,0,700,30,260).color(powderCoat));
p.part("carry-recess", b(0,200,80,220,28,75).color(powderCoat));
p.part("woofer", c(0,-270,100,165,180,10).color(polymer));
p.part("connector", c(250,275,120,100,30,10).color(polymer));



return p.model();
