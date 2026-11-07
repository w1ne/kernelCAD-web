// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mail-tray-dispatch-cart",
  license: 'CC0-1.0',
  title: "Mail tray dispatch cart",
  description: "Mobile tray cart with three low shelves, side rails and a tall push handle. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5d7581", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("mail-tray-dispatch-cart");
p.part("wheel-left-front", b(-320,-240,0,105,90,150).color(color));
p.part("wheel-right-front", b(320,-240,0,105,90,150).color(color));
p.part("wheel-left-back", b(-320,240,0,105,90,150).color(color));
p.part("wheel-right-back", b(320,240,0,105,90,150).color(color));
p.part("bottom-shelf", b(0,0,170,720,540,55).color(color));
p.part("middle-shelf", b(0,0,540,720,540,55).color(color));
p.part("top-shelf", b(0,0,910,720,540,55).color(color));
p.part("left-rail", b(-330,0,220,50,50,1050).color(color));
p.part("right-rail", b(330,0,220,50,50,1050).color(color));
p.part("handle", b(0,0,1270,720,55,55).color(color));
p.part("tray-stop", b(0,-260,955,680,35,95).color(color));

return p.model();
