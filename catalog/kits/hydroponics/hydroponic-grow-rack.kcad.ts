// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "hydroponic-grow-rack",
  license: 'CC0-1.0',
  title: "Hydroponic grow rack",
  description: "Three-tier crop rack with growing channels, end supports, diagonal-looking cross braces and a feed riser. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#64847c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("hydroponic-grow-rack");
p.part("leg-front-left", b(-600,-450,0,55,55,1750).color(color));
p.part("leg-front-right", b(600,-450,0,55,55,1750).color(color));
p.part("leg-back-left", b(-600,450,0,55,55,1750).color(color));
p.part("leg-back-right", b(600,450,0,55,55,1750).color(color));
p.part("lower-channel", b(0,0,360,1150,850,90).color(color));
p.part("middle-channel", b(0,0,900,1150,850,90).color(color));
p.part("upper-channel", b(0,0,1440,1150,850,90).color(color));
p.part("side-feed", b(680,0,260,55,55,1340).color(color));
p.part("crossbar-low", b(0,0,300,1180,55,50).color(color));
p.part("crossbar-high", b(0,0,1650,1180,55,50).color(color));
p.part("feed-pipe", c(680,0,0,1750,22,10).color(color));

return p.model();
