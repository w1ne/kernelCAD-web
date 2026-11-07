// SPDX-License-Identifier: CC0-1.0
// Plastic flake silo: a cylindrical process vessel with roof fittings, access hardware and a low outlet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "plastic-flake-silo",
  license: 'CC0-1.0',
  title: "Plastic flake silo",
  description: "Plastic flake silo: a cylindrical process vessel with roof fittings, access hardware and a low outlet. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "glass plastics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#4a7980', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#567574' },
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

const p = assembly("plastic-flake-silo");
p.part("tank-foot-left-front", b(-336.0,-313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-right-front", b(336.0,-313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-left-back", b(-336.0,313.6,0,100,100,250).color(stainlessSteel));
p.part("tank-foot-right-back", b(336.0,313.6,0,100,100,250).color(stainlessSteel));
p.part("vessel-shell", c(0,0,220,1490,420.0,12).color(paintedSteel));
p.part("top-flange", c(0,0,1710,70,451.5,12).color(paintedSteel));
p.part("roof-cap", c(0,0,1780,160,388.5,12).color(paintedSteel));
p.part("manway", c(0,0,1940,110,125,10).color(paintedSteel));
p.part("vent-stack", c(273.0,0,1910,260,42,10).color(paintedSteel));
p.part("access-ladder", b(451.5,0,220,65,70,1221.8).color(stainlessSteel));
p.part("outlet-pipe", b(357.0,-333.20000000000005,240,180,100,130).color(stainlessSteel));
p.part("drain-valve", c(378.0,-352.8,180,120,42,10).color(stainlessSteel));
p.part("side-nozzle", cy(409.5,294.0,700.3,180,58,10).color(stainlessSteel));
p.part("conical-discharge", c(0,0,100,180,273.0,12).color(paintedSteel));
p.part("outlet-neck", b(0,0,0,170,170,100).color(stainlessSteel));

return p.model();
