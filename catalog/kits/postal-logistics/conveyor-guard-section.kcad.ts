// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "conveyor-guard-section",
  license: 'CC0-1.0',
  title: "Conveyor guard section",
  description: "Guarding panel around a conveyor bay with frame rails and closely spaced upright bars. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758077", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("conveyor-guard-section");
p.part("foot-left", b(-500,0,0,90,250,80).color(color));
p.part("foot-right", b(500,0,0,90,250,80).color(color));
p.part("post-left", b(-500,0,80,55,55,1050).color(color));
p.part("post-right", b(500,0,80,55,55,1050).color(color));
p.part("top-rail", b(0,0,1090,1040,55,55).color(color));
p.part("bottom-rail", b(0,0,140,1040,55,55).color(color));
p.part("bar-a", b(-370,0,195,28,32,880).color(color));
p.part("bar-b", b(-185,0,195,28,32,880).color(color));
p.part("bar-c", b(0,0,195,28,32,880).color(color));
p.part("bar-d", b(185,0,195,28,32,880).color(color));
p.part("bar-e", b(370,0,195,28,32,880).color(color));

return p.model();
