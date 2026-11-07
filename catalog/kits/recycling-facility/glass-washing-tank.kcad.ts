// SPDX-License-Identifier: CC0-1.0
// Glass washing tank: a cylindrical process vessel with roof fittings, access hardware and a low outlet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "glass-washing-tank",
  license: 'CC0-1.0',
  title: "Glass washing tank",
  description: "Glass washing tank: a cylindrical process vessel with roof fittings, access hardware and a low outlet. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#5f7484', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#647176' },
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

const p = assembly("glass-washing-tank");
p.part("tank-foot-left-front", b(-304.0,-313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-right-front", b(304.0,-313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-left-back", b(-304.0,313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-right-back", b(304.0,313.6,0,100,100,250).color(stainlessSteel));
p.part("vessel-shell", c(0,0,220,1610,380.0,12).color(paintedSteel));
p.part("top-flange", c(0,0,1830,70,408.5,12).color(paintedSteel));
p.part("roof-cap", c(0,0,1900,160,351.5,12).color(paintedSteel));
p.part("manway", c(0,0,2060,110,125,10).color(paintedSteel));
p.part("vent-stack", c(247.0,0,2030,260,42,10).color(paintedSteel));
p.part("access-ladder", b(408.5,0,220,65,70,1320.1999999999998).color(stainlessSteel));
p.part("outlet-pipe", b(323.0,-333.20000000000005,240,180,100,130).color(stainlessSteel));
p.part("drain-valve", c(342.0,-352.8,180,120,42,10).color(stainlessSteel));
p.part("side-nozzle", cy(370.5,294.0,756.6999999999999,180,58,10).color(stainlessSteel));

return p.model();
