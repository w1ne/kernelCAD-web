// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "belt-cover-hood",
  license: 'CC0-1.0',
  title: "Belt cover hood",
  description: "Belt cover hood as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#61727c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("belt-cover-hood");
p.part("support-frame-left", b(-509.6,0,0,95,1320.0,985).color(color));
p.part("support-frame-right", b(509.6,0,0,95,1320.0,985).color(color));
p.part("upper-crossbeam", b(0,0,985,1127.0,125,100).color(color));
p.part("material-channel", b(0,0,512.2,735.0,1080.0,170).color(color));
p.part("inspection-hood", b(0,-180.0,1085,882.0,570.0,240).color(color));
p.part("discharge-transition", b(0,630.0,315.2,607.6,340,591.0).color(color));
p.part("access-ladder", b(588.0,300.0,0,75,80,886.5).color(color));
p.part("idler", cy(0,-510.00000000000006,485.59999999999997,95,460.59999999999997,10).color(color));

return p.model();
