// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sorting-operator-console",
  license: 'CC0-1.0',
  title: "Sorting operator console",
  description: "Operator station with angled control desk, twin display blocks, key shelf and status stack. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b7182", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("sorting-operator-console");
p.part("pedestal", b(0,70,0,640,360,780).color(color));
p.part("desk", b(0,-40,780,900,560,75).color(color));
p.part("screen-left", b(-220,80,855,320,60,260).color(color));
p.part("screen-right", b(190,80,855,320,60,260).color(color));
p.part("screen-base-left", b(-220,90,830,90,90,45).color(color));
p.part("screen-base-right", b(190,90,830,90,90,45).color(color));
p.part("keyboard-shelf", b(0,-270,690,620,170,40).color(color));
p.part("keypad", b(0,-250,735,300,110,35).color(color));
p.part("status-post", b(470,160,0,70,70,1080).color(color));
p.part("status-light-a", c(470,160,1080,70,42,8).color(color));
p.part("status-light-b", c(470,160,1150,70,42,8).color(color));
p.part("status-light-c", c(470,160,1220,70,42,8).color(color));

return p.model();
