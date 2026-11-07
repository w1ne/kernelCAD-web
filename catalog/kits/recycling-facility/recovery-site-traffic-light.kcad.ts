// SPDX-License-Identifier: CC0-1.0
// Recovery-site traffic light: a tall site pedestal with a hooded instrument head, antenna and service door. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "recovery-site-traffic-light",
  license: 'CC0-1.0',
  title: "Recovery-site traffic light",
  description: "Recovery-site traffic light: a tall site pedestal with a hooded instrument head, antenna and service door. Low-poly visualization prop. Material controls: concrete, painted steel, safety amber, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#47758a', { label: 'Painted steel' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#54727a', safetyAmber: '#d9a239', stainlessSteel: '#9ea7a5' },
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

const p = assembly("recovery-site-traffic-light");
p.part("mounting-plinth", b(0,0,0,520,420,120).color(concrete));
p.part("pedestal-column", b(0,0,120,180,180,609.0).color(paintedSteel));
p.part("equipment-head", b(0,-40,729.0,722.8000000000001,210,340).color(paintedSteel));
p.part("sun-hood", b(0,-160,1069.0,778.4000000000001,330,55).color(paintedSteel));
p.part("service-door", b(0,-155,789.0,514.3,35,190).color(paintedSteel));
p.part("antenna", b(319.7,40,1069.0,20,20,260).color(paintedSteel));
p.part("warning-beacon", c(-319.7,-80,1039.0,115,55,10).color(safetyAmber));
p.part("cable-gland", c(0,95,130,115,30,10).color(stainlessSteel));

return p.model();
