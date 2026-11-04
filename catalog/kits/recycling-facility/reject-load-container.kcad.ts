// SPDX-License-Identifier: CC0-1.0
// Reject-load container: a deep receiving hopper with fork pockets and exposed pivot points. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "reject-load-container",
  license: 'CC0-1.0',
  title: "Reject-load container",
  description: "Reject-load container: a deep receiving hopper with fork pockets and exposed pivot points. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#707b86', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#707678', stainlessSteel: '#9ea7a5' },
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

const p = assembly("reject-load-container");
p.part("tipping-base", b(0,0,0,1360,900,100).color(paintedSteel));
p.part("hopper-front", b(0,-390.0,100,1360,120,950).color(paintedSteel));
p.part("hopper-back", b(0,395.0,100,1360,110,950).color(paintedSteel));
p.part("hopper-left", b(-620.0,0,100,120,750,950).color(paintedSteel));
p.part("hopper-right", b(620.0,0,100,120,750,950).color(paintedSteel));
p.part("front-lip", b(0,-470.0,1060,1390,75,75).color(paintedSteel));
p.part("pivot-left", c(-725.0,0,160,180,65,10).color(stainlessSteel));
p.part("pivot-right", c(725.0,0,160,180,65,10).color(stainlessSteel));
p.part("fork-pocket-left", b(-453.3333333333333,0,0,110,648.0,90).color(stainlessSteel));
p.part("fork-pocket-right", b(453.3333333333333,0,0,110,648.0,90).color(stainlessSteel));

return p.model();
