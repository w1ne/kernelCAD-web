// SPDX-License-Identifier: CC0-1.0
// Household hazardous-waste cabinet: its foundation, equipment and top. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "household-hazardous-waste-cabinet",
  license: 'CC0-1.0',
  title: "Household hazardous-waste cabinet",
  description: "Household hazardous-waste cabinet: its foundation, equipment and top. Low-poly visualization prop. Material controls: concrete, painted steel, glass, rubber.",
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
const glass = param('glass', '#4f9ca8', { label: 'Glass' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#54727a', glass: '#55939a', rubber: '#3c403e' },
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

const p = assembly("household-hazardous-waste-cabinet");
p.part("foundation", b(0,0,0,1872.0,924.0000000000001,100).color(concrete));
p.part("equipment-body", b(0,0,100,1560,840,609.0).color(paintedSteel));
p.part("top-panel", b(0,0,709.0,1638.0,882.0,80).color(paintedSteel));
p.part("screen-face", b(0,-445.0,451.5,717.6,35,336.0).color(glass));
p.part("button-panel", b(514.8000000000001,-450.0,160,280.8,40,210).color(paintedSteel));
p.part("mount-foot-a", c(-546.0,285.6,0,100,45,10).color(paintedSteel));
p.part("mount-foot-b", c(546.0,285.6,0,100,45,10).color(paintedSteel));
p.part("side-grip", cy(-842.4000000000001,80,367.5,110,32,10).color(rubber));

return p.model();
