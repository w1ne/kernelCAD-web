// SPDX-License-Identifier: CC0-1.0
// Prop storage rack: Three-tier backstage storage rack with open shelves, side uprights and caster housings.

meta({
  name: "prop-storage-rack",
  license: 'CC0-1.0',
  title: "Prop storage rack",
  description: "Three-tier backstage storage rack with open shelves, side uprights and caster housings. Knobs: overall scale; aluminum, polymer controls and cable jacket, rubber and isolation pads; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    aluminum: '#c7cecf',
    polymer: '#344e5b',
    rubber: '#222629',
  },
  touring: {
    aluminum: '#dce3e2',
    polymer: '#e3a928',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("prop-storage-rack");
p.part("left-upright", b(-600,0,0,55,65,1750).color(aluminum));
p.part("right-upright", b(600,0,0,55,65,1750).color(aluminum));
p.part("left-front-post", b(-600,-300,0,55,55,1750).color(aluminum));
p.part("right-front-post", b(600,-300,0,55,55,1750).color(aluminum));
p.part("shelf-low", b(0,0,220,1190,650,55).color(polymer));
p.part("shelf-mid", b(0,0,780,1190,650,55).color(polymer));
p.part("shelf-high", b(0,0,1340,1190,650,55).color(polymer));
p.part("front-lip-low", b(0,-315,220,1180,35,105).color(polymer));
p.part("front-lip-mid", b(0,-315,780,1180,35,105).color(polymer));
p.part("front-lip-high", b(0,-315,1340,1180,35,105).color(polymer));

return p.model();

p.part("caster-left-front", c(-560,-280,0,155,50,10).color(rubber));
p.part("caster-right-front", c(560,-280,0,155,50,10).color(rubber));
p.part("caster-left-back", c(-560,280,0,155,50,10).color(rubber));
p.part("caster-right-back", c(560,280,0,155,50,10).color(rubber));
