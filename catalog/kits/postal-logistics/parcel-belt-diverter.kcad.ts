// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-belt-diverter",
  license: 'CC0-1.0',
  title: "Parcel belt diverter",
  description: "Conveyor section with a side-mounted actuator and a broad parcel-pushing paddle. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#587981", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-belt-diverter");
p.part("belt", b(0,0,680,640,950,65).color(color));
p.part("side-left", b(-310,0,725,25,950,70).color(color));
p.part("side-right", b(310,0,725,25,950,70).color(color));
p.part("support-1", b(-240,-350,0,55,55,680).color(color));
p.part("support-2", b(240,-350,0,55,55,680).color(color));
p.part("support-3", b(-240,350,0,55,55,680).color(color));
p.part("support-4", b(240,350,0,55,55,680).color(color));
p.part("actuator", b(390,0,700,160,180,110).color(color));
p.part("pusher-arm", b(300,0,800,55,360,55).color(color));
p.part("paddle", b(185,0,845,45,300,200).color(color));
p.part("roller-a", b(0,-280,735,560,32,24).color(color));
p.part("roller-b", b(0,0,735,560,32,24).color(color));
p.part("roller-c", b(0,280,735,560,32,24).color(color));

return p.model();
