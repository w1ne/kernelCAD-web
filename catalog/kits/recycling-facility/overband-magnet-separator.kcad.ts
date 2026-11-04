// SPDX-License-Identifier: CC0-1.0
// Overband magnet separator: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "overband-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband magnet separator",
  description: "Overband magnet separator: a guarded screening bed with a feed hopper, discharge lip and support rollers. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#61727c', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#667071' },
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

const p = assembly("overband-magnet-separator");
p.part("support-rail-left", b(-422.4,0,0,90,1500,170).color(stainlessSteel));
p.part("support-rail-right", b(422.4,0,0,90,1500,170).color(stainlessSteel));
p.part("screen-bed", b(0,0,320,774.4,1230.0,130).color(stainlessSteel));
p.part("feed-hopper", b(0,-690.0,272.0,721.5999999999999,350,459.00000000000006).color(paintedSteel));
p.part("oversize-chute", b(0,705.0,306.0,686.4,360,260).color(paintedSteel));
p.part("side-guard-left", b(-352.0,0,450,55,1200.0,180).color(paintedSteel));
p.part("side-guard-right", b(352.0,0,450,55,1200.0,180).color(paintedSteel));
p.part("vibrator-left", c(-220.0,0,580,220,85,10).color(paintedSteel));
p.part("vibrator-right", c(220.0,0,580,220,85,10).color(paintedSteel));
p.part("support-roller-1", cy(0,-510.00000000000006,110,90,75,10).color(stainlessSteel));
p.part("support-roller-2", cy(0,-180.00000000000006,110,90,75,10).color(stainlessSteel));
p.part("support-roller-3", cy(0,149.99999999999994,110,90,75,10).color(stainlessSteel));
p.part("support-roller-4", cy(0,479.99999999999994,110,90,75,10).color(stainlessSteel));

return p.model();
