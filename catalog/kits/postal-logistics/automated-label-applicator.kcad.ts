// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "automated-label-applicator",
  license: 'CC0-1.0',
  title: "Automated label applicator",
  description: "Labeling head suspended above a narrow parcel conveyor with guarding and feed controls. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5a7287", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("automated-label-applicator");
p.part("conveyor", b(0,0,620,720,1000,65).color(color));
p.part("frame-left", b(-320,-120,0,55,55,620).color(color));
p.part("frame-right", b(320,-120,0,55,55,620).color(color));
p.part("upright-left", b(-320,-120,620,55,55,980).color(color));
p.part("upright-right", b(320,-120,620,55,55,980).color(color));
p.part("crossbeam", b(0,-120,1540,720,65,65).color(color));
p.part("label-roll", b(-150,-120,1220,170,160,180).color(color));
p.part("applicator-head", b(80,-120,1120,200,170,190).color(color));
p.part("press-pad", b(80,-120,1030,140,120,45).color(color));
p.part("control-box", b(410,-60,440,110,190,210).color(color));
p.part("roller-a", b(0,-300,680,650,30,22).color(color));
p.part("roller-b", b(0,0,680,650,30,22).color(color));
p.part("roller-c", b(0,300,680,650,30,22).color(color));

return p.model();
