// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bulk-mail-hamper",
  license: 'CC0-1.0',
  title: "Bulk mail hamper",
  description: "Large open hamper with reinforced corners, removable liner and low handling skids. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b737e", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("bulk-mail-hamper");
p.part("base", b(0,0,0,760,620,80).color(color));
p.part("front-wall", b(0,-280,80,760,55,630).color(color));
p.part("back-wall", b(0,280,80,760,55,630).color(color));
p.part("left-wall", b(-350,0,80,55,520,630).color(color));
p.part("right-wall", b(350,0,80,55,520,630).color(color));
p.part("liner", b(0,0,145,650,510,510).color(color));
p.part("corner-a", b(-360,-290,80,45,45,650).color(color));
p.part("corner-b", b(360,-290,80,45,45,650).color(color));
p.part("corner-c", b(-360,290,80,45,45,650).color(color));
p.part("corner-d", b(360,290,80,45,45,650).color(color));
p.part("skid-left", b(-230,0,0,90,590,55).color(color));
p.part("skid-right", b(230,0,0,90,590,55).color(color));

return p.model();
