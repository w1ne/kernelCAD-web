// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-sortation-tray-cabinet",
  license: 'CC0-1.0',
  title: "Postal sortation tray cabinet",
  description: "Tall cabinet with stacked tray openings, central dividers and a low stabilizing plinth. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#627a7a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-sortation-tray-cabinet");
p.part("plinth", b(0,0,0,850,520,100).color(color));
p.part("left-side", b(-390,0,100,60,520,1350).color(color));
p.part("right-side", b(390,0,100,60,520,1350).color(color));
p.part("top", b(0,0,1450,850,520,70).color(color));
p.part("back", b(0,230,150,720,40,1280).color(color));
p.part("shelf-a", b(0,0,360,720,450,45).color(color));
p.part("shelf-b", b(0,0,650,720,450,45).color(color));
p.part("shelf-c", b(0,0,940,720,450,45).color(color));
p.part("shelf-d", b(0,0,1230,720,450,45).color(color));
p.part("divider-a", b(-180,0,380,25,440,270).color(color));
p.part("divider-b", b(180,0,670,25,440,270).color(color));
p.part("divider-c", b(-180,0,960,25,440,270).color(color));
p.part("divider-d", b(180,0,1250,25,440,270).color(color));

return p.model();
