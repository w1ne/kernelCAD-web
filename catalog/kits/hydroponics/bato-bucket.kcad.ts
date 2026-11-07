// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bato-bucket",
  license: 'CC0-1.0',
  title: "Bato bucket",
  description: "Single recirculating media bucket with a top collar, lower drain fitting and short feed tube. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#7c897b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("bato-bucket");
p.part("bucket-body", b(0,0,0,420,420,500).color(color));
p.part("upper-rim", b(0,0,500,470,470,65).color(color));
p.part("inset-lid", b(0,0,565,390,390,40).color(color));
p.part("front-panel", b(0,-214,140,310,28,190).color(color));
p.part("side-rib-left", b(-185,0,65,32,380,390).color(color));
p.part("side-rib-right", b(185,0,65,32,380,390).color(color));
p.part("drain-bulkhead", c(0,-235,90,95,42,10).color(color));
p.part("feed-stub", c(0,220,520,160,24,10).color(color));

return p.model();
