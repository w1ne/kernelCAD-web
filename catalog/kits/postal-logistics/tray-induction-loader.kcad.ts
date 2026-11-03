// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "tray-induction-loader",
  license: 'CC0-1.0',
  title: "Tray induction loader",
  description: "Feed station with a tray staging deck, backstop, side guides and operator controls. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e7481", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("tray-induction-loader");
p.part("base", b(0,0,0,800,650,85).color(color));
p.part("feed-deck", b(0,0,600,760,650,60).color(color));
p.part("backstop", b(0,290,660,760,45,130).color(color));
p.part("guide-left", b(-365,0,660,35,580,80).color(color));
p.part("guide-right", b(365,0,660,35,580,80).color(color));
p.part("tray-stack-a", b(0,-80,675,540,110,42).color(color));
p.part("tray-stack-b", b(0,40,717,540,110,42).color(color));
p.part("tray-stack-c", b(0,160,759,540,110,42).color(color));
p.part("control-post", b(470,-230,0,70,70,520).color(color));
p.part("control-head", b(470,-230,520,220,140,150).color(color));
p.part("display", b(470,-210,600,155,15,82).color(color));

return p.model();
