// SPDX-License-Identifier: CC0-1.0
// Scenic flat panel: Lightweight scenery flat with a broad facing, perimeter rails, two battens and foot blocks.

meta({
  name: "scenic-flat-panel",
  license: 'CC0-1.0',
  title: "Scenic flat panel",
  description: "Lightweight scenery flat with a broad facing, perimeter rails, two battens and foot blocks. Knobs: overall scale; stage timber, painted steel, rubber and isolation pads, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const timber = param('timber', '#946b43', { label: 'Stage timber' });
const steel = param('steel', '#46515a', { label: 'Painted steel' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    timber: '#725137',
    steel: '#343b41',
    rubber: '#222629',
    hardware: '#c5a052',
  },
  touring: {
    timber: '#cd914b',
    steel: '#315968',
    rubber: '#25292c',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("scenic-flat-panel");
p.part("face", b(0,0,0,1500,85,2100).color(timber));
p.part("left-stile", b(-700,55,0,75,55,2100).color(steel));
p.part("right-stile", b(700,55,0,75,55,2100).color(steel));
p.part("top-rail", b(0,55,2030,1400,55,70).color(steel));
p.part("bottom-rail", b(0,55,0,1400,55,70).color(steel));
p.part("batten-low", b(0,60,480,1380,45,50).color(steel));
p.part("batten-high", b(0,60,1560,1380,45,50).color(steel));
p.part("foot-left", b(-650,-20,0,150,300,85).color(rubber));
p.part("foot-right", b(650,-20,0,150,300,85).color(rubber));
p.part("hinge-pin-left", c(-680,-75,700,75,26,10).color(hardware));
p.part("hinge-pin-right", c(680,-75,700,75,26,10).color(hardware));



return p.model();
