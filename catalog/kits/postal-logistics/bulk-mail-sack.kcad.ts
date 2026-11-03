// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bulk-mail-sack",
  license: 'CC0-1.0',
  title: "Bulk mail sack",
  description: "Upright dispatch sack with a reinforced base, folded collar and tie-down tabs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#717b75", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("bulk-mail-sack");
p.part("sack-body", c(0,0,0,650,250,10).color(color));
p.part("folded-collar", b(0,0,610,500,500,90).color(color));
p.part("front-tab-left", b(-155,-255,580,80,45,70).color(color));
p.part("front-tab-right", b(155,-255,580,80,45,70).color(color));
p.part("tie-bar", b(0,-275,655,320,35,40).color(color));
p.part("base-seam", b(0,0,55,520,520,38).color(color));
p.part("label-patch", b(0,-260,350,170,18,120).color(color));

return p.model();
