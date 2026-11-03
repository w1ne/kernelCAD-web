// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rolling-postal-container",
  license: 'CC0-1.0',
  title: "Rolling postal container",
  description: "Four-wheel high-sided mail container with cage uprights, two shelves and a swing gate. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7c7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("rolling-postal-container");
p.part("base", b(0,0,140,720,520,75).color(color));
p.part("wheel-left-front", b(-300,-230,0,110,80,140).color(color));
p.part("wheel-right-front", b(300,-230,0,110,80,140).color(color));
p.part("wheel-left-back", b(-300,230,0,110,80,140).color(color));
p.part("wheel-right-back", b(300,230,0,110,80,140).color(color));
p.part("post-left", b(-330,-230,215,38,38,1120).color(color));
p.part("post-right", b(330,-230,215,38,38,1120).color(color));
p.part("post-left-back", b(-330,230,215,38,38,1120).color(color));
p.part("post-right-back", b(330,230,215,38,38,1120).color(color));
p.part("top-front", b(0,-230,1335,680,38,38).color(color));
p.part("top-back", b(0,230,1335,680,38,38).color(color));
p.part("shelf", b(0,0,700,650,440,45).color(color));
p.part("gate", b(0,-245,250,600,28,500).color(color));

return p.model();
