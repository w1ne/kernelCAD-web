// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "gravity-roller-conveyor",
  license: 'CC0-1.0',
  title: "Gravity roller conveyor",
  description: "Short gravity roller section with raised containment rails and two-height support stands. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#758078", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("gravity-roller-conveyor");
p.part("roller-bed", b(0,0,620,600,950,65).color(color));
p.part("left-guide", b(-295,0,685,25,950,80).color(color));
p.part("right-guide", b(295,0,685,25,950,80).color(color));
p.part("front-leg-left", b(-220,-360,0,55,55,600).color(color));
p.part("front-leg-right", b(220,-360,0,55,55,600).color(color));
p.part("rear-leg-left", b(-220,360,0,55,55,470).color(color));
p.part("rear-leg-right", b(220,360,0,55,55,470).color(color));
p.part("roller-1", b(0,-330,690,530,38,24).color(color));
p.part("roller-2", b(0,-165,690,530,38,24).color(color));
p.part("roller-3", b(0,0,690,530,38,24).color(color));
p.part("roller-4", b(0,165,690,530,38,24).color(color));
p.part("roller-5", b(0,330,690,530,38,24).color(color));

return p.model();
