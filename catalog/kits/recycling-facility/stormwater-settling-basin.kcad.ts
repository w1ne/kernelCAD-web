// SPDX-License-Identifier: CC0-1.0
// Stormwater settling basin: its basin floor, berm and walkway. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "stormwater-settling-basin",
  license: 'CC0-1.0',
  title: "Stormwater settling basin",
  description: "Stormwater settling basin: its basin floor, berm and walkway. Low-poly visualization prop. Material controls: concrete, painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#64757a', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#68726f', stainlessSteel: '#9ea7a5' },
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

const p = assembly("stormwater-settling-basin");
p.part("basin-floor", b(0,0,0,1320.0,1021.9999999999999,100).color(concrete));
p.part("front-berm", b(0,-459.9,100,1320.0,160,687.5).color(concrete));
p.part("back-berm", b(0,459.9,100,1320.0,160,687.5).color(concrete));
p.part("left-berm", b(-616.0,0,100,160,876.0,687.5).color(concrete));
p.part("right-berm", b(616.0,0,100,160,876.0,687.5).color(concrete));
p.part("walkway", b(0,-255.49999999999997,525.0,1056.0,140,60).color(paintedSteel));
p.part("sample-pipe", c(440.0,0,0,1250,38,10).color(stainlessSteel));
p.part("level-gauge", c(-484.00000000000006,0,120,900.0,45,10).color(stainlessSteel));

return p.model();
