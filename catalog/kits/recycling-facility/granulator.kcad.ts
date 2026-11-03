// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "granulator",
  license: 'CC0-1.0',
  title: "Granulator",
  description: "Granulator as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7756", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("granulator");
p.part("base-frame", b(0,0,0,1180,990,170).color(color));
p.part("cutting-housing", b(0,0,170,944.0,693.0,952.0000000000001).color(color));
p.part("feed-hopper-front", b(0,-415.8,952.0000000000001,1038.4,316.8,680.0).color(color));
p.part("feed-lip", b(0,-544.5,935.0000000000001,1062.0,130,85).color(color));
p.part("discharge-chute", b(0,415.8,170,731.6,237.6,595.0).color(color));
p.part("cutting-shaft-a", cy(-236.0,0,578.0,574.1999999999999,95,12).color(color));
p.part("cutting-shaft-b", cy(236.0,0,578.0,574.1999999999999,95,12).color(color));
p.part("side-service-panel", b(495.59999999999997,0,476.00000000000006,75,435.6,612.0).color(color));
p.part("drive-motor", c(672.5999999999999,257.40000000000003,210,330,135,10).color(color));
p.part("warning-beacon", c(-448.4,-297.0,1428.0,105,45,10).color(color));

return p.model();
