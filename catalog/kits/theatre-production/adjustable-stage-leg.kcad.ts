// SPDX-License-Identifier: CC0-1.0
// Adjustable stage leg: Telescoping stage support with a broad floor plate, outer sleeve, adjustment collar and cap pad.

meta({
  name: "adjustable-stage-leg",
  license: 'CC0-1.0',
  title: "Adjustable stage leg",
  description: "Telescoping stage support with a broad floor plate, outer sleeve, adjustment collar and cap pad. Knobs: overall scale; painted steel, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const paintedSteel = param('paintedSteel', '#454d54', { label: 'Painted steel' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    paintedSteel: '#313940',
    hardware: '#c5a052',
    rubber: '#222629',
  },
  touring: {
    paintedSteel: '#dda21f',
    hardware: '#e2b347',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("adjustable-stage-leg");
p.part("floor-plate", b(0,0,0,360,360,55).color(paintedSteel));
p.part("sleeve", b(0,0,55,135,135,560).color(paintedSteel));
p.part("inner-post", b(0,0,615,82,82,300).color(paintedSteel));
p.part("deck-cap", b(0,0,915,220,220,45).color(paintedSteel));
p.part("pin-tab", b(78,0,510,75,50,95).color(hardware));
p.part("collar", c(0,0,550,75,92,10).color(hardware));
p.part("locking-pin", c(0,-90,480,55,19,10).color(hardware));
p.part("level-foot", c(0,0,0,44,110,10).color(rubber));



return p.model();
