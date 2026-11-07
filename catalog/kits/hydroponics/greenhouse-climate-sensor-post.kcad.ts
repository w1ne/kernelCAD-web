// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "greenhouse-climate-sensor-post",
  license: 'CC0-1.0',
  title: "Greenhouse climate sensor post",
  description: "Freestanding sensor mast with radiation shield discs, junction box and cross-arm mount. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#76877c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("greenhouse-climate-sensor-post");
p.part("weighted-foot", b(0,0,0,400,400,100).color(color));
p.part("junction-box", b(170,0,680,210,170,240).color(color));
p.part("cross-arm", b(0,0,1540,700,50,50).color(color));
p.part("sensor-head", b(-230,0,1530,200,180,140).color(color));
p.part("rain-shield-top", b(230,0,1260,280,280,28).color(color));
p.part("rain-shield-mid", b(230,0,1200,280,280,28).color(color));
p.part("rain-shield-low", b(230,0,1140,280,280,28).color(color));
p.part("mast", c(0,0,100,1460,35,10).color(color));
p.part("aspiration-cap", c(-230,0,1670,95,78,10).color(color));
p.part("cable-gland", c(170,-100,680,100,30,10).color(color));

return p.model();
