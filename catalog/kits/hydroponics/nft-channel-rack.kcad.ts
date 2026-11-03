// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nft-channel-rack",
  license: 'CC0-1.0',
  title: "NFT channel rack",
  description: "A-frame-like nutrient film channel stand with paired trough levels, end stops and a vertical feed riser. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#65867f", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("nft-channel-rack");
p.part("left-foot", b(-620,0,0,160,760,70).color(color));
p.part("right-foot", b(620,0,0,160,760,70).color(color));
p.part("left-upright", b(-560,0,70,55,55,1370).color(color));
p.part("right-upright", b(560,0,70,55,55,1370).color(color));
p.part("lower-channel-left", b(-300,0,350,480,1450,80).color(color));
p.part("lower-channel-right", b(300,0,350,480,1450,80).color(color));
p.part("upper-channel-left", b(-300,0,930,480,1450,80).color(color));
p.part("upper-channel-right", b(300,0,930,480,1450,80).color(color));
p.part("top-crossbar", b(0,0,1390,1180,60,55).color(color));
p.part("feed-header", b(0,-730,700,1100,45,45).color(color));
p.part("feed-riser", c(0,-730,70,900,24,10).color(color));

return p.model();
