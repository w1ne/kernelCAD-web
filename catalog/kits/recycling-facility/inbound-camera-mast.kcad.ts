// SPDX-License-Identifier: CC0-1.0
// Inbound camera mast: a tall site pedestal with a hooded instrument head, antenna and service door. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "inbound-camera-mast",
  license: 'CC0-1.0',
  title: "Inbound camera mast",
  description: "Inbound camera mast: a tall site pedestal with a hooded instrument head, antenna and service door. Low-poly visualization prop. Material controls: concrete, painted steel, safety amber, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#6c7882', { label: 'Painted steel' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#6d7475', safetyAmber: '#d9a239', stainlessSteel: '#9ea7a5' },
  highVisibility: { paintedSteel: '#d77632', safetyAmber: '#ffd044' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const ngon = (r:number,s:number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 2), r * Math.sin(Math.PI / 2));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const loftCylinder = (h:number,r:number,s:number) => {
  const levels = [0, h * 0.06, h * 0.94, h];
  const radii = [r * 0.9, r, r, r * 0.9];
  const profiles = levels.map((_, i) => ngon(radii[i], s));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("inbound-camera-mast");
p.part("mounting-plinth", b(0,0,0,520,420,120).color(concrete));
p.part("pedestal-column", b(0,0,120,180,180,672.8).color(paintedSteel));
p.part("equipment-head", b(0,-40,792.8,634.4,210,340).color(paintedSteel));
p.part("sun-hood", b(0,-160,1132.8,683.2,330,55).color(paintedSteel));
p.part("service-door", b(0,-155,852.8,451.4,35,190).color(paintedSteel));
p.part("antenna", b(280.6,40,1132.8,20,20,260).color(paintedSteel));
p.part("warning-beacon", c(-280.6,-80,1102.8,115,55,10).color(safetyAmber));
p.part("cable-gland", c(0,95,130,115,30,10).color(stainlessSteel));

return p.model();
