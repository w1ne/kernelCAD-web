// SPDX-License-Identifier: CC0-1.0
// Modular stage deck: Portable stage module with a broad top, perimeter edge trim, braced underframe and leveling feet.

meta({
  name: "modular-stage-deck",
  license: 'CC0-1.0',
  title: "Modular stage deck",
  description: "Portable stage module with a broad top, perimeter edge trim, braced underframe and leveling feet. Knobs: overall scale; stage timber, painted steel, rubber and isolation pads; houseShow and touring appearance presets.",
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

presets({
  houseShow: {
    timber: '#725137',
    steel: '#343b41',
    rubber: '#222629',
  },
  touring: {
    timber: '#cd914b',
    steel: '#315968',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("modular-stage-deck");
p.part("deck-top", b(0,0,420,1800,1200,100).color(timber));
p.part("edge-front", b(0,-590,365,1820,45,55).color(steel));
p.part("edge-back", b(0,590,365,1820,45,55).color(steel));
p.part("edge-left", b(-880,0,365,45,1140,55).color(steel));
p.part("edge-right", b(880,0,365,45,1140,55).color(steel));
p.part("underframe-front", b(0,-470,260,1700,55,65).color(steel));
p.part("underframe-back", b(0,470,260,1700,55,65).color(steel));
p.part("underframe-left", b(-780,0,260,55,920,65).color(steel));
p.part("underframe-right", b(780,0,260,55,920,65).color(steel));
p.part("foot-a", c(-700,-430,0,260,65,10).color(rubber));
p.part("foot-b", c(700,-430,0,260,65,10).color(rubber));
p.part("foot-c", c(-700,430,0,260,65,10).color(rubber));
p.part("foot-d", c(700,430,0,260,65,10).color(rubber));



return p.model();
