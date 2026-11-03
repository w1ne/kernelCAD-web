// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "scanner-sensor-post",
  license: 'CC0-1.0',
  title: "Scanner sensor post",
  description: "Floor-mounted scanner mast with a short arm, compact reader block and cable housing. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#566f83", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("scanner-sensor-post");
p.part("foot", b(0,0,0,260,260,70).color(color));
p.part("mast", b(0,0,70,85,85,1120).color(color));
p.part("arm", b(90,0,980,300,70,60).color(color));
p.part("sensor", b(235,0,890,210,160,130).color(color));
p.part("lens", b(235,-86,900,125,18,70).color(color));
p.part("junction-box", b(-120,0,570,130,155,190).color(color));
p.part("cable-gland", b(-120,-86,600,65,35,45).color(color));
p.part("anchor-left", b(-85,-90,0,55,55,50).color(color));
p.part("anchor-right", b(85,90,0,55,55,50).color(color));

return p.model();
