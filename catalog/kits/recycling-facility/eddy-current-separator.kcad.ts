// SPDX-License-Identifier: CC0-1.0
// Eddy-current separator: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "eddy-current-separator",
  license: 'CC0-1.0',
  title: "Eddy-current separator",
  description: "Eddy-current separator: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#506c68', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#5a6c63' },
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

const p = assembly("eddy-current-separator");
p.part("support-rail-left", b(-326.4,0,0,90,2020,170).color(stainlessSteel));
p.part("support-rail-right", b(326.4,0,0,90,2020,170).color(stainlessSteel));
p.part("screen-bed", b(0,0,265,598.4,1656.3999999999999,130).color(stainlessSteel));
p.part("feed-hopper", b(0,-929.2,185.6,557.6,350,313.20000000000005).color(paintedSteel));
p.part("oversize-chute", b(0,949.4,208.79999999999998,530.4,360,260).color(paintedSteel));
p.part("side-guard-left", b(-272.0,0,395,55,1616.0,180).color(paintedSteel));
p.part("side-guard-right", b(272.0,0,395,55,1616.0,180).color(paintedSteel));
p.part("vibrator-left", c(-170.0,0,525,220,85,10).color(paintedSteel));
p.part("vibrator-right", c(170.0,0,525,220,85,10).color(paintedSteel));
p.part("support-roller-1", cy(0,-686.8000000000001,110,90,75,10).color(stainlessSteel));
p.part("support-roller-2", cy(0,-242.4000000000001,110,90,75,10).color(stainlessSteel));
p.part("support-roller-3", cy(0,201.9999999999999,110,90,75,10).color(stainlessSteel));
p.part("support-roller-4", cy(0,646.3999999999997,110,90,75,10).color(stainlessSteel));

return p.model();
