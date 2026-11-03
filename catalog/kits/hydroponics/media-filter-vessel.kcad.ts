// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "media-filter-vessel",
  license: 'CC0-1.0',
  title: "Media filter vessel",
  description: "Compact vertical filtration tank with bolted-looking top ring, service hatch and lower legs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7d74", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("media-filter-vessel");
p.part("base-frame", b(0,0,0,800,800,100).color(color));
p.part("front-panel", b(0,-410,250,570,35,700).color(color));
p.part("side-panel", b(410,0,250,35,710,700).color(color));
p.part("top-ring", b(0,0,1130,850,850,75).color(color));
p.part("service-cover", b(-270,-390,760,160,30,180).color(color));
p.part("left-foot", b(-280,-260,0,90,90,280).color(color));
p.part("right-foot", b(280,-260,0,90,90,280).color(color));
p.part("vessel-shell", c(0,0,100,1180,350,10).color(color));
p.part("inlet-port", c(-380,-270,520,230,58,10).color(color));
p.part("outlet-port", c(380,-270,780,230,58,10).color(color));
p.part("backwash-port", c(0,390,980,175,42,10).color(color));

return p.model();
