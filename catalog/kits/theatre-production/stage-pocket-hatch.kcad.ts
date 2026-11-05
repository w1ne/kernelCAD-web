// SPDX-License-Identifier: CC0-1.0
// Stage pocket hatch: Flush access-hatch panel with a perimeter frame, lift recess and corner hinge barrels.

meta({
  name: "stage-pocket-hatch",
  license: 'CC0-1.0',
  title: "Stage pocket hatch",
  description: "Flush access-hatch panel with a perimeter frame, lift recess and corner hinge barrels. Knobs: overall scale; painted steel, stage timber, steel hardware; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const steel = param('steel', '#46515a', { label: 'Painted steel' });
const timber = param('timber', '#946b43', { label: 'Stage timber' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });

presets({
  houseShow: {
    steel: '#343b41',
    timber: '#725137',
    hardware: '#c5a052',
  },
  touring: {
    steel: '#315968',
    timber: '#cd914b',
    hardware: '#e2b347',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-pocket-hatch");
p.part("frame-front", b(0,-340,0,900,55,70).color(steel));
p.part("frame-back", b(0,340,0,900,55,70).color(steel));
p.part("frame-left", b(-425,0,0,55,625,70).color(steel));
p.part("frame-right", b(425,0,0,55,625,70).color(steel));
p.part("hatch-panel", b(0,0,42,790,570,45).color(timber));
p.part("lift-recess", b(0,-250,85,180,30,28).color(steel));
p.part("hinge-strap-left", b(-350,345,0,120,50,90).color(hardware));
p.part("hinge-strap-right", b(350,345,0,120,50,90).color(hardware));
p.part("hinge-barrel-left", c(-300,345,45,105,28,10).color(hardware));
p.part("hinge-barrel-right", c(300,345,45,105,28,10).color(hardware));



return p.model();
