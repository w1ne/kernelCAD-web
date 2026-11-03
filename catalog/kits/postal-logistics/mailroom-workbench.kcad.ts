// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mailroom-workbench",
  license: 'CC0-1.0',
  title: "Mailroom workbench",
  description: "Sorting workbench with storage cubbies, a high back rail and a broad writing surface. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#687c7a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("mailroom-workbench");
p.part("top", b(0,0,850,1320,620,65).color(color));
p.part("left-leg", b(-590,220,0,70,70,850).color(color));
p.part("right-leg", b(590,220,0,70,70,850).color(color));
p.part("left-rear-leg", b(-590,-220,0,70,70,850).color(color));
p.part("right-rear-leg", b(590,-220,0,70,70,850).color(color));
p.part("back-rail", b(0,270,915,1280,55,120).color(color));
p.part("cubby-base", b(0,-20,250,1150,430,50).color(color));
p.part("cubby-top", b(0,-20,490,1150,430,45).color(color));
p.part("cubby-left", b(-560,-20,270,45,430,260).color(color));
p.part("cubby-right", b(560,-20,270,45,430,260).color(color));
p.part("divider-a", b(-190,-20,270,35,420,220).color(color));
p.part("divider-b", b(190,-20,270,35,420,220).color(color));
p.part("keyboard-tray", b(0,-250,700,600,150,35).color(color));

return p.model();
