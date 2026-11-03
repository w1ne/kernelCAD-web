// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-singulator",
  license: 'CC0-1.0',
  title: "Parcel singulator",
  description: "Induction belt with adjustable side guides, separator bars and a raised feed throat. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536e7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-singulator");
p.part("feed-deck", b(0,0,610,720,1100,65).color(color));
p.part("guide-left", b(-320,0,675,34,1100,105).color(color));
p.part("guide-right", b(320,0,675,34,1100,105).color(color));
p.part("throat-left", b(-240,-460,700,120,160,95).color(color));
p.part("throat-right", b(240,-460,700,120,160,95).color(color));
p.part("separator-a", b(0,-260,705,650,30,28).color(color));
p.part("separator-b", b(0,-40,705,650,30,28).color(color));
p.part("separator-c", b(0,180,705,650,30,28).color(color));
p.part("separator-d", b(0,400,705,650,30,28).color(color));
p.part("stand-left", b(-280,0,0,60,60,610).color(color));
p.part("stand-right", b(280,0,0,60,60,610).color(color));
p.part("infeed-stop", b(0,-520,680,520,40,45).color(color));

return p.model();
