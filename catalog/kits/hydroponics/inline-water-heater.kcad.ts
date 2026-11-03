// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "inline-water-heater",
  license: 'CC0-1.0',
  title: "Inline water heater",
  description: "Vertical inline heater housing with insulated jacket, access panel and inlet/outlet unions. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697f77", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("inline-water-heater");
p.part("support-base", b(0,0,0,550,500,70).color(color));
p.part("front-panel", b(0,-270,260,350,30,520).color(color));
p.part("insulation-band", b(0,0,450,500,510,75).color(color));
p.part("junction-box", b(220,-170,630,170,150,170).color(color));
p.part("top-cap", b(0,0,820,510,510,70).color(color));
p.part("heater-body", c(0,0,70,800,220,10).color(color));
p.part("inlet-union", c(0,-80,0,230,40,10).color(color));
p.part("outlet-union", c(0,-80,820,230,40,10).color(color));
p.part("status-post", c(-190,-160,700,130,25,10).color(color));

return p.model();
