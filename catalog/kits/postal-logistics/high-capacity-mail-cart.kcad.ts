// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "high-capacity-mail-cart",
  license: 'CC0-1.0',
  title: "High-capacity mail cart",
  description: "Two-tier mail cart with push handle, corner guards and four block-style caster housings. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#60767c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("high-capacity-mail-cart");
p.part("lower-deck", b(0,0,230,760,560,65).color(color));
p.part("upper-deck", b(0,0,780,760,560,65).color(color));
p.part("upright-left", b(-330,220,295,55,55,1030).color(color));
p.part("upright-right", b(330,220,295,55,55,1030).color(color));
p.part("push-handle", b(0,220,1300,760,55,55).color(color));
p.part("wheel-front-left", b(-330,-220,0,120,100,230).color(color));
p.part("wheel-front-right", b(330,-220,0,120,100,230).color(color));
p.part("wheel-back-left", b(-330,220,0,120,100,230).color(color));
p.part("wheel-back-right", b(330,220,0,120,100,230).color(color));
p.part("lower-stop", b(0,-270,295,700,35,100).color(color));
p.part("upper-stop", b(0,-270,845,700,35,100).color(color));

return p.model();
