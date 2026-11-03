// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-overflow-container",
  license: 'CC0-1.0',
  title: "Parcel overflow container",
  description: "Deep overflow tub with a reinforcing rim, drain-like feet and two lift handles. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5f7880", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-overflow-container");
p.part("tub-base", b(0,0,0,780,600,90).color(color));
p.part("front-wall", b(0,-265,90,780,70,520).color(color));
p.part("back-wall", b(0,265,90,780,70,520).color(color));
p.part("left-wall", b(-355,0,90,70,460,520).color(color));
p.part("right-wall", b(355,0,90,70,460,520).color(color));
p.part("rim-front", b(0,-270,610,820,80,55).color(color));
p.part("rim-back", b(0,270,610,820,80,55).color(color));
p.part("rim-left", b(-365,0,610,80,540,55).color(color));
p.part("rim-right", b(365,0,610,80,540,55).color(color));
p.part("handle-left", b(-425,0,340,65,160,90).color(color));
p.part("handle-right", b(425,0,340,65,160,90).color(color));
p.part("foot-left", b(-240,0,0,110,120,55).color(color));
p.part("foot-right", b(240,0,0,110,120,55).color(color));

return p.model();
