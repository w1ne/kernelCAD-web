// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "conveyor-merge-module",
  license: 'CC0-1.0',
  title: "Conveyor merge module",
  description: "Two infeed belts meet at a compact parcel merge deck with a central guide and support frame. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#547c87", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("conveyor-merge-module");
p.part("merge-deck", b(0,60,740,740,720,55).color(color));
p.part("infeed-left", b(-380,-300,700,400,520,50).color(color));
p.part("infeed-right", b(380,-300,700,400,520,50).color(color));
p.part("left-guide", b(-340,-300,755,22,520,70).color(color));
p.part("right-guide", b(340,-300,755,22,520,70).color(color));
p.part("center-guide", b(0,80,795,45,480,95).color(color));
p.part("support-left", b(-290,70,0,55,55,710).color(color));
p.part("support-right", b(290,70,0,55,55,710).color(color));
p.part("cross-brace", b(0,70,260,620,65,55).color(color));
p.part("roller-row-a", b(0,-140,775,620,35,22).color(color));
p.part("roller-row-b", b(0,10,775,620,35,22).color(color));
p.part("roller-row-c", b(0,160,775,620,35,22).color(color));

return p.model();
