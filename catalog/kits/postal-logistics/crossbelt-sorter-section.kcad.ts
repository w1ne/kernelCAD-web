// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "crossbelt-sorter-section",
  license: 'CC0-1.0',
  title: "Crossbelt sorter section",
  description: "Elevated sortation track section with repeated shallow crossbelt carriage trays. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#56777d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("crossbelt-sorter-section");
p.part("track-base", b(0,0,690,680,1180,75).color(color));
p.part("side-left", b(-330,0,735,30,1180,65).color(color));
p.part("side-right", b(330,0,735,30,1180,65).color(color));
p.part("support-left-front", b(-270,-450,0,55,55,690).color(color));
p.part("support-right-front", b(270,-450,0,55,55,690).color(color));
p.part("support-left-back", b(-270,450,0,55,55,690).color(color));
p.part("support-right-back", b(270,450,0,55,55,690).color(color));
p.part("tray-1", b(0,-390,790,500,150,50).color(color));
p.part("tray-2", b(0,-130,790,500,150,50).color(color));
p.part("tray-3", b(0,130,790,500,150,50).color(color));
p.part("tray-4", b(0,390,790,500,150,50).color(color));
p.part("drive-panel", b(390,0,370,80,180,260).color(color));

return p.model();
