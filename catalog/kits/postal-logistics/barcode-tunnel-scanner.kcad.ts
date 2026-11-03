// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "barcode-tunnel-scanner",
  license: 'CC0-1.0',
  title: "Barcode tunnel scanner",
  description: "Open-sided parcel scanning tunnel with multiple raised scan heads above a short belt. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596e83", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("barcode-tunnel-scanner");
p.part("belt", b(0,0,570,720,850,65).color(color));
p.part("left-leg-front", b(-330,-300,0,50,50,570).color(color));
p.part("right-leg-front", b(330,-300,0,50,50,570).color(color));
p.part("left-leg-back", b(-330,300,0,50,50,570).color(color));
p.part("right-leg-back", b(330,300,0,50,50,570).color(color));
p.part("arch-left", b(-330,0,570,60,760,720).color(color));
p.part("arch-right", b(330,0,570,60,760,720).color(color));
p.part("arch-top", b(0,0,1260,720,760,60).color(color));
p.part("scan-head-front", b(0,-270,1160,170,170,115).color(color));
p.part("scan-head-back", b(0,270,1160,170,170,115).color(color));
p.part("side-window-left", b(-285,0,1020,18,240,170).color(color));
p.part("side-window-right", b(285,0,1020,18,240,170).color(color));

return p.model();
