// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-dimensioning-arch",
  license: 'CC0-1.0',
  title: "Parcel dimensioning arch",
  description: "Conveyor portal with overhead and side sensor blocks for parcel size measurement. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536f86", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-dimensioning-arch");
p.part("conveyor", b(0,0,600,720,1050,70).color(color));
p.part("left-foot", b(-350,-300,0,60,60,600).color(color));
p.part("right-foot", b(350,-300,0,60,60,600).color(color));
p.part("left-post", b(-350,0,600,60,60,1320).color(color));
p.part("right-post", b(350,0,600,60,60,1320).color(color));
p.part("crossbar", b(0,0,1260,760,70,75).color(color));
p.part("top-sensor", b(0,0,1170,180,150,110).color(color));
p.part("side-sensor-left", b(-295,-40,870,65,160,180).color(color));
p.part("side-sensor-right", b(295,-40,870,65,160,180).color(color));
p.part("roller-a", b(0,-300,650,650,32,26).color(color));
p.part("roller-b", b(0,0,650,650,32,26).color(color));
p.part("roller-c", b(0,300,650,650,32,26).color(color));

return p.model();
