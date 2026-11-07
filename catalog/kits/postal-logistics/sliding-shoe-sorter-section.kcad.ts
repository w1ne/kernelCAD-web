// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sliding-shoe-sorter-section",
  license: 'CC0-1.0',
  title: "Sliding shoe sorter section",
  description: "Parcel sorter deck with diverter shoes, guide rails and a compact discharge lane. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5a737b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("sliding-shoe-sorter-section");
p.part("sorter-bed", b(0,0,700,680,1200,70).color(color));
p.part("left-guide", b(-330,0,745,28,1200,80).color(color));
p.part("right-guide", b(330,0,745,28,1200,80).color(color));
p.part("shoe-rail", b(0,0,790,55,1140,35).color(color));
p.part("shoe-a", b(-130,-260,820,70,95,42).color(color));
p.part("shoe-b", b(-60,-60,820,70,95,42).color(color));
p.part("shoe-c", b(20,150,820,70,95,42).color(color));
p.part("shoe-d", b(100,360,820,70,95,42).color(color));
p.part("discharge-lane", b(470,260,690,280,650,65).color(color));
p.part("support-left-a", b(-270,-420,0,55,55,700).color(color));
p.part("support-right-a", b(270,-420,0,55,55,700).color(color));
p.part("support-left-b", b(-270,420,0,55,55,700).color(color));
p.part("support-right-b", b(270,420,0,55,55,700).color(color));

return p.model();
