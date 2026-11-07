// SPDX-License-Identifier: CC0-1.0
// Rolling stage platform: Mobile platform with a raised work deck, guard sockets and four compact caster blocks.

meta({
  name: "rolling-stage-platform",
  license: 'CC0-1.0',
  title: "Rolling stage platform",
  description: "Mobile platform with a raised work deck, guard sockets and four compact caster blocks. Knobs: overall scale; stage timber, painted steel, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
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

const p = assembly("rolling-stage-platform");
p.part("platform-deck", b(0,0,440,1400,980,95).color(timber));
p.part("front-apron", b(0,-480,220,1400,55,240).color(timber));
p.part("rear-apron", b(0,480,220,1400,55,240).color(timber));
p.part("underframe-left", b(-620,0,180,55,880,60).color(steel));
p.part("underframe-right", b(620,0,180,55,880,60).color(steel));
p.part("socket-left", b(-550,0,535,90,90,100).color(hardware));
p.part("socket-right", b(550,0,535,90,90,100).color(hardware));

p.part("caster-fork-left-front", b(-600, -410, 112, 110, 120, 70).color(steel));
p.part("caster-wheel-left-front", cylinder(50, 58, 10).rotateX(90).translate(-600, -410, 58).scale(scale).color(rubber));
p.part("caster-fork-left-back", b(-600, 410, 112, 110, 120, 70).color(steel));
p.part("caster-wheel-left-back", cylinder(50, 58, 10).rotateX(-90).translate(-600, 410, 58).scale(scale).color(rubber));
p.part("caster-fork-right-front", b(600, -410, 112, 110, 120, 70).color(steel));
p.part("caster-wheel-right-front", cylinder(50, 58, 10).rotateX(90).translate(600, -410, 58).scale(scale).color(rubber));
p.part("caster-fork-right-back", b(600, 410, 112, 110, 120, 70).color(steel));
p.part("caster-wheel-right-back", cylinder(50, 58, 10).rotateX(-90).translate(600, 410, 58).scale(scale).color(rubber));

return p.model();
