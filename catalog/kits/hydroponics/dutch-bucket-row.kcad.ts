// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "dutch-bucket-row",
  license: 'CC0-1.0',
  title: "Dutch bucket row",
  description: "Four media buckets on a shared stand with paired feed header and drain return rail. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#78867a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("dutch-bucket-row");
p.part("support-frame-left", b(-790,0,0,65,250,680).color(color));
p.part("support-frame-right", b(790,0,0,65,250,680).color(color));
p.part("longitudinal-rail-front", b(0,-120,610,1640,55,55).color(color));
p.part("longitudinal-rail-back", b(0,120,610,1640,55,55).color(color));
p.part("bucket-1", b(-570,0,0,340,300,520).color(color));
p.part("bucket-2", b(-190,0,0,340,300,520).color(color));
p.part("bucket-3", b(190,0,0,340,300,520).color(color));
p.part("bucket-4", b(570,0,0,340,300,520).color(color));
p.part("feed-header", b(0,-230,620,50,500,45).color(color));
p.part("return-header", b(0,230,90,50,500,45).color(color));
p.part("feed-riser", c(-820,-230,0,700,24,10).color(color));
p.part("return-drop", c(820,230,0,190,28,10).color(color));

return p.model();
