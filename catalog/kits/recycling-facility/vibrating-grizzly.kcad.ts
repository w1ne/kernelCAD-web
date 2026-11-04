// SPDX-License-Identifier: CC0-1.0
// Vibrating grizzly: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "vibrating-grizzly",
  license: 'CC0-1.0',
  title: "Vibrating grizzly",
  description: "Vibrating grizzly: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#75656d', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#736767' },
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

const p = assembly("vibrating-grizzly");
p.part("support-rail-left", b(-470.4,0,0,90,2280,170).color(stainlessSteel));
p.part("support-rail-right", b(470.4,0,0,90,2280,170).color(stainlessSteel));
p.part("screen-bed", b(0,0,210,862.4,1869.6,130).color(stainlessSteel));
p.part("feed-hopper", b(0,-1048.8,315.2,803.5999999999999,350,531.9000000000001).color(paintedSteel));
p.part("oversize-chute", b(0,1071.6,354.59999999999997,764.4,360,260).color(paintedSteel));
p.part("side-guard-left", b(-392.0,0,340,55,1824.0,180).color(paintedSteel));
p.part("side-guard-right", b(392.0,0,340,55,1824.0,180).color(paintedSteel));
p.part("vibrator-left", c(-245.0,0,470,220,85,10).color(paintedSteel));
p.part("vibrator-right", c(245.0,0,470,220,85,10).color(paintedSteel));
p.part("support-roller-1", cy(0,-775.2,110,90,75,10).color(stainlessSteel));
p.part("support-roller-2", cy(0,-273.6,110,90,75,10).color(stainlessSteel));
p.part("support-roller-3", cy(0,228.0,110,90,75,10).color(stainlessSteel));
p.part("support-roller-4", cy(0,729.6000000000001,110,90,75,10).color(stainlessSteel));

return p.model();
