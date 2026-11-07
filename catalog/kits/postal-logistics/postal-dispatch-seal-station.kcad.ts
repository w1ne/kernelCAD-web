// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-dispatch-seal-station",
  license: 'CC0-1.0',
  title: "Postal dispatch seal station",
  description: "Dispatch table with a powered sealing head, mail sack guide and completed-bag shelf. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667778", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-dispatch-seal-station");
p.part("table", b(0,0,760,960,600,65).color(color));
p.part("leg-left", b(-380,-210,0,55,55,760).color(color));
p.part("leg-right", b(380,-210,0,55,55,760).color(color));
p.part("leg-back-left", b(-380,210,0,55,55,760).color(color));
p.part("leg-back-right", b(380,210,0,55,55,760).color(color));
p.part("sealer-post", b(-160,70,825,65,65,400).color(color));
p.part("sealer-head", b(-160,70,1225,280,200,100).color(color));
p.part("press-foot", b(-160,70,785,240,160,45).color(color));
p.part("bag-guide", b(250,80,820,260,280,90).color(color));
p.part("lower-shelf", b(0,170,300,800,80,45).color(color));
p.part("control-box", b(400,-100,660,100,150,180).color(color));

return p.model();
