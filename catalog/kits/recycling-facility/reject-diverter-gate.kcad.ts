// SPDX-License-Identifier: CC0-1.0
// Original low-poly recycling-facility scene prop, millimetres, Z up.

meta({
  name: "reject-diverter-gate",
  license: 'CC0-1.0',
  title: "Reject diverter gate",
  description: "Reject diverter gate as original low-poly scene equipment for a recycling and materials-recovery facility. Visualization geometry only. Knobs: overall scale and asset color.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#75656d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("reject-diverter-gate");
p.part("support-frame-left", b(-457.6,0,0,95,2006.4,850).color(color));
p.part("support-frame-right", b(457.6,0,0,95,2006.4,850).color(color));
p.part("upper-crossbeam", b(0,0,850,1011.9999999999999,125,100).color(color));
p.part("material-channel", b(0,0,442.0,660.0,1641.6,170).color(color));
p.part("inspection-hood", b(0,-273.59999999999997,950,792.0,866.4,240).color(color));
p.part("discharge-transition", b(0,957.5999999999999,272.0,545.6,340,510.0).color(color));
p.part("access-ladder", b(528.0,456.0,0,75,80,765.0).color(color));
p.part("idler", cy(0,-775.2,438.59999999999997,95,413.59999999999997,10).color(color));

return p.model();
