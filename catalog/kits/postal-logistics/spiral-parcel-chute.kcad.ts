// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "spiral-parcel-chute",
  license: 'CC0-1.0',
  title: "Spiral parcel chute",
  description: "Compact gravity chute assembled from four turning shelf sections around a central mast. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747d79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("spiral-parcel-chute");
p.part("foot", b(0,0,0,800,800,70).color(color));
p.part("mast", b(0,0,60,80,80,1500).color(color));
p.part("level-1", b(280,0,310,640,270,60).color(color));
p.part("level-2", b(0,280,630,270,640,60).color(color));
p.part("level-3", b(-280,0,950,640,270,60).color(color));
p.part("level-4", b(0,-280,1270,270,640,60).color(color));
p.part("guard-a", b(580,0,370,25,270,120).color(color));
p.part("guard-b", b(0,580,690,270,25,120).color(color));
p.part("guard-c", b(-580,0,1010,25,270,120).color(color));
p.part("guard-d", b(0,-580,1330,270,25,120).color(color));
p.part("landing-pad", b(0,0,1450,470,470,65).color(color));

return p.model();
