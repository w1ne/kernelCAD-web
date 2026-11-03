// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-sack-rack",
  license: 'CC0-1.0',
  title: "Postal sack rack",
  description: "Freestanding rack with hanging sack bays, crossbars and a weighted floor frame. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6e7a78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-sack-rack");
p.part("base-left", b(-430,0,0,70,700,80).color(color));
p.part("base-right", b(430,0,0,70,700,80).color(color));
p.part("post-left", b(-430,0,80,60,60,1420).color(color));
p.part("post-right", b(430,0,80,60,60,1420).color(color));
p.part("top-bar", b(0,0,1430,920,65,65).color(color));
p.part("middle-bar", b(0,0,790,870,45,45).color(color));
p.part("bay-divider-left", b(-145,0,120,32,650,1260).color(color));
p.part("bay-divider-right", b(145,0,120,32,650,1260).color(color));
p.part("sack-a", b(-275,0,160,250,390,610).color(color));
p.part("sack-b", b(0,0,160,250,390,610).color(color));
p.part("sack-c", b(275,0,160,250,390,610).color(color));
p.part("sack-collar-a", b(-275,0,770,260,390,55).color(color));
p.part("sack-collar-b", b(0,0,770,260,390,55).color(color));
p.part("sack-collar-c", b(275,0,770,260,390,55).color(color));

return p.model();
