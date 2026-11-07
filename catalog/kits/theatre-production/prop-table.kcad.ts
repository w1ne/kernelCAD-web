// SPDX-License-Identifier: CC0-1.0
// Prop table: Backstage props table with a broad worktop, lower shelf, four legs and end-stop rail.

meta({
  name: "prop-table",
  license: 'CC0-1.0',
  title: "Prop table",
  description: "Backstage props table with a broad worktop, lower shelf, four legs and end-stop rail. Knobs: overall scale; stage timber, painted steel, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
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
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    timber: '#725137',
    steel: '#343b41',
    hardware: '#c5a052',
    rubber: '#222629',
  },
  touring: {
    timber: '#cd914b',
    steel: '#315968',
    hardware: '#e2b347',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("prop-table");
p.part("worktop", b(0,0,780,1500,700,65).color(timber));
p.part("lower-shelf", b(0,50,260,1380,520,50).color(timber));
p.part("left-front-leg", b(-680,-280,0,65,65,780).color(steel));
p.part("right-front-leg", b(680,-280,0,65,65,780).color(steel));
p.part("left-back-leg", b(-680,280,0,65,65,780).color(steel));
p.part("right-back-leg", b(680,280,0,65,65,780).color(steel));
p.part("back-rail", b(0,315,845,1450,40,95).color(steel));
p.part("drawer-front", b(0,-290,480,640,35,150).color(steel));
p.part("handle", b(0,-315,520,280,35,35).color(hardware));
p.part("level-foot-a", c(-680,-280,0,75,30,10).color(rubber));
p.part("level-foot-b", c(680,280,0,75,30,10).color(rubber));



return p.model();
