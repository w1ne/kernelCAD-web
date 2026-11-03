// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "telescopic-parcel-conveyor",
  license: 'CC0-1.0',
  title: "Telescopic parcel conveyor",
  description: "Extending conveyor boom on an adjustable support frame with wheel blocks and nested belt sections. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#547582", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("telescopic-parcel-conveyor");
p.part("base-frame", b(0,0,0,760,700,95).color(color));
p.part("lower-boom", b(0,100,720,620,980,70).color(color));
p.part("middle-boom", b(0,390,850,540,800,55).color(color));
p.part("inner-boom", b(0,650,960,470,600,45).color(color));
p.part("left-support", b(-300,-180,95,55,55,600).color(color));
p.part("right-support", b(300,-180,95,55,55,600).color(color));
p.part("crossbar", b(0,-180,650,660,70,55).color(color));
p.part("left-wheel", b(-345,-230,0,110,65,130).color(color));
p.part("right-wheel", b(345,-230,0,110,65,130).color(color));
p.part("control-box", b(370,-80,350,90,120,160).color(color));

return p.model();
