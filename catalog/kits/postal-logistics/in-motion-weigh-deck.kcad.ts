// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "in-motion-weigh-deck",
  license: 'CC0-1.0',
  title: "In-motion weigh deck",
  description: "Short instrumented roller bed with a raised weighing platform and indicator module. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697b7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("in-motion-weigh-deck");
p.part("scale-base", b(0,0,0,780,860,120).color(color));
p.part("weigh-deck", b(0,0,520,740,820,70).color(color));
p.part("roller-a", b(0,-280,590,680,38,28).color(color));
p.part("roller-b", b(0,-100,590,680,38,28).color(color));
p.part("roller-c", b(0,100,590,680,38,28).color(color));
p.part("roller-d", b(0,280,590,680,38,28).color(color));
p.part("indicator-post", b(470,-340,120,65,65,500).color(color));
p.part("indicator-head", b(470,-340,620,220,110,150).color(color));
p.part("display", b(470,-320,660,160,15,75).color(color));
p.part("foot-left", b(-330,-370,0,80,80,80).color(color));
p.part("foot-right", b(330,-370,0,80,80,80).color(color));

return p.model();
