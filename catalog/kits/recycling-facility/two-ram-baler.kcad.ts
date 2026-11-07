// SPDX-License-Identifier: CC0-1.0
// Two-ram baler: a press chamber, ram, upper gantry and clear discharge floor. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "two-ram-baler",
  license: 'CC0-1.0',
  title: "Two-ram baler",
  description: "Two-ram baler: a press chamber, ram, upper gantry and clear discharge floor. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#7d6752', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#796854' },
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

const p = assembly("two-ram-baler");
p.part("base-skid", b(0,0,0,1310,990,125).color(stainlessSteel));
p.part("press-chamber", b(0,0,125,1074.2,772.2,1085.0).color(paintedSteel));
p.part("front-door-frame", b(0,-425.7,160,890.8000000000001,110,837.0).color(paintedSteel));
p.part("press-plate", b(0,-257.40000000000003,852.5000000000001,838.4,210,160).color(paintedSteel));
p.part("upper-gantry", b(0,0,1209.0,1257.6,891.0,160).color(paintedSteel));
p.part("discharge-floor", b(0,-475.2,110,759.8,190,120).color(paintedSteel));
p.part("control-cabinet", b(733.6,0,0,300,360,930.0).color(paintedSteel));
p.part("hydraulic-cylinder", cy(0,237.6,1131.5,280,115,10).color(paintedSteel));
p.part("pressure-gauge", c(694.3000000000001,-217.8,868.0000000000001,120,45,10).color(stainlessSteel));

return p.model();
