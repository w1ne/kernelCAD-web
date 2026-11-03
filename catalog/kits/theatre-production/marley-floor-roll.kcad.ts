// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "marley-floor-roll",
  license: 'CC0-1.0',
  title: "Marley floor roll",
  description: "Rolled performance-floor sheet with a broad cylindrical core, loose leading edge and carry cradle. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626b77", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("marley-floor-roll");
p.part("cradle-left", b(-480,0,0,110,420,170).color(color));
p.part("cradle-right", b(480,0,0,110,420,170).color(color));
p.part("cradle-crossbar", b(0,0,50,900,75,75).color(color));
p.part("loose-sheet", b(0,-310,0,950,75,65).color(color));
p.part("end-strap-left", b(-470,0,0,42,380,55).color(color));
p.part("end-strap-right", b(470,0,0,42,380,55).color(color));
p.part("roll-core", c(0,0,95,780,185,10).color(color));
p.part("core-cap-left", c(-405,0,95,90,118,10).color(color));
p.part("core-cap-right", c(405,0,95,90,118,10).color(color));
p.part("retainer-pin", c(0,0,875,75,30,10).color(color));

return p.model();
