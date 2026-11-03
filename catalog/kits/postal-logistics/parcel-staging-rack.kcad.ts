// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-staging-rack",
  license: 'CC0-1.0',
  title: "Parcel staging rack",
  description: "Three-level parcel rack with reinforced uprights, shelf beams and a top clearance frame. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687b79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-staging-rack");
p.part("upright-left", b(-500,0,0,55,70,1700).color(color));
p.part("upright-right", b(500,0,0,55,70,1700).color(color));
p.part("front-post-left", b(-500,-280,0,55,55,1700).color(color));
p.part("front-post-right", b(500,-280,0,55,55,1700).color(color));
p.part("rear-post-left", b(-500,280,0,55,55,1700).color(color));
p.part("rear-post-right", b(500,280,0,55,55,1700).color(color));
p.part("shelf-bottom", b(0,0,120,1060,650,55).color(color));
p.part("shelf-middle", b(0,0,680,1060,650,55).color(color));
p.part("shelf-top", b(0,0,1240,1060,650,55).color(color));
p.part("beam-front-a", b(0,-280,600,1000,55,65).color(color));
p.part("beam-back-a", b(0,280,600,1000,55,65).color(color));
p.part("beam-front-b", b(0,-280,1160,1000,55,65).color(color));
p.part("beam-back-b", b(0,280,1160,1000,55,65).color(color));

return p.model();
