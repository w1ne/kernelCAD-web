// SPDX-License-Identifier: CC0-1.0
// Mobile compactor: a press chamber, ram, upper gantry and clear discharge floor. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mobile-compactor",
  license: 'CC0-1.0',
  title: "Mobile compactor",
  description: "Mobile compactor: a press chamber, ram, upper gantry and clear discharge floor. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#566d6d', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#5e6c67' },
  highVisibility: { paintedSteel: '#d77632' },
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
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("mobile-compactor");
p.part("base-skid", b(0,0,0,1440,1130,125).color(stainlessSteel));
p.part("press-chamber", b(0,0,125,1180.8,881.4,1085.0).color(paintedSteel));
p.part("front-door-frame", b(0,-485.9,160,979.2,110,837.0).color(paintedSteel));
p.part("press-plate", b(0,-293.8,852.5000000000001,921.6,210,160).color(paintedSteel));
p.part("upper-gantry", b(0,0,1209.0,1382.3999999999999,1017.0,160).color(paintedSteel));
p.part("discharge-floor", b(0,-542.4,110,835.1999999999999,190,120).color(paintedSteel));
p.part("control-cabinet", b(806.4000000000001,0,0,300,360,930.0).color(paintedSteel));
p.part("hydraulic-cylinder", cy(0,271.2,1131.5,280,115,10).color(paintedSteel));
p.part("pressure-gauge", c(763.2,-248.6,868.0000000000001,120,45,10).color(stainlessSteel));

return p.model();
