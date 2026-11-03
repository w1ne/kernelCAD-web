// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-label-printer",
  license: 'CC0-1.0',
  title: "Postal label printer",
  description: "Desktop shipping-label printer with raised lid, feed slot and output catch tray. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#536d79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-label-printer");
p.part("printer-base", b(0,0,0,430,360,180).color(color));
p.part("printer-body", b(0,0,180,430,360,250).color(color));
p.part("lid", b(0,20,430,440,340,38).color(color));
p.part("feed-roll", b(0,175,480,180,45,65).color(color));
p.part("output-tray", b(0,-225,145,340,90,30).color(color));
p.part("front-panel", b(0,-184,260,290,18,90).color(color));
p.part("button", b(155,-204,315,42,22,42).color(color));
p.part("left-foot", b(-165,120,0,55,55,35).color(color));
p.part("right-foot", b(165,120,0,55,55,35).color(color));

return p.model();
