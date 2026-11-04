// SPDX-License-Identifier: CC0-1.0
// Bale weighing platform: its machine, access door and feed chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bale-weighing-platform",
  license: 'CC0-1.0',
  title: "Bale weighing platform",
  description: "Bale weighing platform: its machine, access door and feed chute. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6b7756', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#6d7357', stainlessSteel: '#9ea7a5' },
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

const p = assembly("bale-weighing-platform");
p.part("base-frame", b(0,0,0,1180,1130,140).color(paintedSteel));
p.part("machine-body", b(0,0,140,967.5999999999999,881.4,1054.0).color(paintedSteel));
p.part("front-access-door", b(0,-474.59999999999997,220,613.6,60,682.0).color(paintedSteel));
p.part("feed-chute", b(0,-610.2,837.0,849.6,260,542.5).color(paintedSteel));
p.part("outlet-chute", b(0,565.0,160,542.8000000000001,210,558.0).color(paintedSteel));
p.part("service-panel", b(590.0,0,434.00000000000006,75,452.0,527.0).color(paintedSteel));
p.part("control-pedestal", b(684.4,-339.0,0,240,260,868.0000000000001).color(paintedSteel));
p.part("drive-drum", c(-649.0,0,651.0,370,120,10).color(stainlessSteel));
p.part("transfer-roller", cy(0,-429.4,449.8,100,424.8,10).color(stainlessSteel));

return p.model();
