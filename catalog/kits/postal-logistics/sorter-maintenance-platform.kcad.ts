// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sorter-maintenance-platform",
  license: 'CC0-1.0',
  title: "Sorter maintenance platform",
  description: "Raised access deck with guardrails, four support legs and a short three-step approach. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687b7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("sorter-maintenance-platform");
p.part("deck", b(0,0,760,950,600,75).color(color));
p.part("post-left-front", b(-440,-270,835,45,45,470).color(color));
p.part("post-right-front", b(440,-270,835,45,45,470).color(color));
p.part("post-left-back", b(-440,270,835,45,45,470).color(color));
p.part("post-right-back", b(440,270,835,45,45,470).color(color));
p.part("rail-front", b(0,-270,1275,900,45,45).color(color));
p.part("rail-back", b(0,270,1275,900,45,45).color(color));
p.part("rail-left", b(-440,0,1275,45,500,45).color(color));
p.part("rail-right", b(440,0,1275,45,500,45).color(color));
p.part("leg-left", b(-380,180,0,55,55,760).color(color));
p.part("leg-right", b(380,180,0,55,55,760).color(color));
p.part("step-a", b(0,-450,220,390,130,60).color(color));
p.part("step-b", b(0,-450,400,390,130,60).color(color));
p.part("step-c", b(0,-450,580,390,130,60).color(color));

return p.model();
