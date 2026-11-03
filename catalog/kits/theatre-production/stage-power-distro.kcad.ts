// SPDX-License-Identifier: CC0-1.0
// Original low-poly theatre-production scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "stage-power-distro",
  license: 'CC0-1.0',
  title: "Stage power distribution box",
  description: "Portable stage power enclosure with locking lid, connector rows, carry handles and skid feet. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: 'base',
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d747b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("stage-power-distro");
p.part("case", b(0,0,80,850,620,820).color(color));
p.part("lid", b(0,0,900,880,650,80).color(color));
p.part("front-panel", b(0,-315,260,740,35,480).color(color));
p.part("panel-left", b(-310,-340,340,100,35,320).color(color));
p.part("panel-right", b(310,-340,340,100,35,320).color(color));
p.part("handle-left", b(-470,0,390,80,100,55).color(color));
p.part("handle-right", b(470,0,390,80,100,55).color(color));
p.part("skid-left", b(-280,0,0,100,580,80).color(color));
p.part("skid-right", b(280,0,0,100,580,80).color(color));
p.part("connector-a", c(-230,-365,190,120,40,10).color(color));
p.part("connector-b", c(0,-365,190,120,40,10).color(color));
p.part("connector-c", c(230,-365,190,120,40,10).color(color));

return p.model();
