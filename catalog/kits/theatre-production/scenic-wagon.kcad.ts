// SPDX-License-Identifier: CC0-1.0
// Scenic wagon: Low rolling scenery wagon with a deck, corner posts, push bar and four wheel housings.

meta({
  name: "scenic-wagon",
  license: 'CC0-1.0',
  title: "Scenic wagon",
  description: "Low rolling scenery wagon with a deck, corner posts, push bar and four wheel housings. Knobs: overall scale; stage timber, painted steel, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
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

const p = assembly("scenic-wagon");
p.part("deck", b(0,0,220,1500,920,90).color(timber));
p.part("front-stop", b(0,-430,310,1450,45,100).color(steel));
p.part("back-stop", b(0,430,310,1450,45,100).color(steel));
p.part("post-left-front", b(-680,-400,310,55,55,700).color(steel));
p.part("post-right-front", b(680,-400,310,55,55,700).color(steel));
p.part("post-left-back", b(-680,400,310,55,55,700).color(steel));
p.part("post-right-back", b(680,400,310,55,55,700).color(steel));
p.part("handle-left", b(-760,400,220,55,55,770).color(hardware));
p.part("handle-right", b(760,400,220,55,55,770).color(hardware));
p.part("handle-top", b(0,400,990,1560,55,55).color(hardware));

p.part("caster-bracket-left-front", b(-640, -380, 120, 110, 100, 110).color(hardware));
p.part("caster-wheel-left-front", cylinder(52, 62, 10).rotateX(90).translate(-640, -380, 62).scale(scale).color(rubber));
p.part("caster-bracket-left-back", b(-640, 380, 120, 110, 100, 110).color(hardware));
p.part("caster-wheel-left-back", cylinder(52, 62, 10).rotateX(-90).translate(-640, 380, 62).scale(scale).color(rubber));
p.part("caster-bracket-right-front", b(640, -380, 120, 110, 100, 110).color(hardware));
p.part("caster-wheel-right-front", cylinder(52, 62, 10).rotateX(90).translate(640, -380, 62).scale(scale).color(rubber));
p.part("caster-bracket-right-back", b(640, 380, 120, 110, 100, 110).color(hardware));
p.part("caster-wheel-right-back", cylinder(52, 62, 10).rotateX(-90).translate(640, 380, 62).scale(scale).color(rubber));

return p.model();
