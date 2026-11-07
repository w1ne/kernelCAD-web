// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "conveyor-transfer-bridge",
  license: 'CC0-1.0',
  title: "Conveyor transfer bridge",
  description: "Short transfer bridge that aligns roller rows between adjoining parcel conveyor beds. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#607b80", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("conveyor-transfer-bridge");
p.part("bridge-deck", b(0,0,710,650,560,60).color(color));
p.part("left-rail", b(-310,0,750,26,560,65).color(color));
p.part("right-rail", b(310,0,750,26,560,65).color(color));
p.part("stand-left", b(-230,0,0,55,55,710).color(color));
p.part("stand-right", b(230,0,0,55,55,710).color(color));
p.part("crossbar", b(0,0,330,480,70,55).color(color));
p.part("roller-1", b(0,-210,760,570,34,24).color(color));
p.part("roller-2", b(0,-70,760,570,34,24).color(color));
p.part("roller-3", b(0,70,760,570,34,24).color(color));
p.part("roller-4", b(0,210,760,570,34,24).color(color));
p.part("alignment-stop", b(0,250,795,450,35,55).color(color));

return p.model();
