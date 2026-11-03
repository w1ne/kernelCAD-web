// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-weigh-station",
  license: 'CC0-1.0',
  title: "Parcel weigh station",
  description: "Floor scale platform, upright digital indicator and a compact parcel staging shelf. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657a83", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-weigh-station");
p.part("platform", b(0,0,0,760,720,100).color(color));
p.part("top-plate", b(0,0,100,740,700,30).color(color));
p.part("indicator-stem", b(420,270,110,50,50,720).color(color));
p.part("indicator-head", b(420,270,810,260,140,180).color(color));
p.part("display", b(420,250,850,180,15,90).color(color));
p.part("shelf-left", b(-440,200,280,80,80,390).color(color));
p.part("shelf-right", b(0,200,280,800,80,35).color(color));
p.part("foot-left", b(-300,-300,0,70,70,90).color(color));
p.part("foot-right", b(300,-300,0,70,70,90).color(color));

return p.model();
