// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mailpiece-thickness-gauge",
  license: 'CC0-1.0',
  title: "Mailpiece thickness gauge",
  description: "Bench gauge with measuring bridge, adjustable stop and broad reference plate. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#707d78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("mailpiece-thickness-gauge");
p.part("base-plate", b(0,0,0,620,460,45).color(color));
p.part("left-post", b(-240,0,45,55,55,420).color(color));
p.part("right-post", b(240,0,45,55,55,420).color(color));
p.part("bridge", b(0,0,430,540,80,65).color(color));
p.part("gauge-slider", b(0,-40,250,130,90,190).color(color));
p.part("measuring-foot", b(0,-30,195,180,160,45).color(color));
p.part("stop-block", b(210,60,45,65,70,125).color(color));
p.part("index-rail", b(-100,-100,140,300,28,35).color(color));
p.part("dial", b(0,-95,455,115,55,25).color(color));

return p.model();
