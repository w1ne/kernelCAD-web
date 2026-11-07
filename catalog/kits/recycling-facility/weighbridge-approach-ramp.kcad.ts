// SPDX-License-Identifier: CC0-1.0
// Weighbridge approach ramp: a sloped approach plate with side curbs, transition plate and ground anchors. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "weighbridge-approach-ramp",
  license: 'CC0-1.0',
  title: "Weighbridge approach ramp",
  description: "Weighbridge approach ramp: a sloped approach plate with side curbs, transition plate and ground anchors. Low-poly visualization prop. Material controls: painted steel, concrete, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#6c7882', { label: 'Painted steel' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#6d7475', concrete: '#84857b', stainlessSteel: '#9ea7a5' },
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

const p = assembly("weighbridge-approach-ramp");
p.part("ramp-apron", b(0,0,0,3000,1300,120).color(paintedSteel));
p.part("ramp-surface", b(0,0,120,2800,1150,260).color(paintedSteel));
p.part("side-curb-left", b(-1430,0,0,100,1350,380).color(paintedSteel));
p.part("side-curb-right", b(1430,0,0,100,1350,380).color(paintedSteel));
p.part("transition-plate", b(0,-690,100,2820,160,60).color(paintedSteel));
p.part("ground-anchor-left", b(-1200,520,0,180,180,130).color(concrete));
p.part("ground-anchor-right", b(1200,520,0,180,180,130).color(concrete));
p.part("roller-left", c(-1250,-650,0,95,54,10).color(stainlessSteel));
p.part("roller-right", c(1250,-650,0,95,54,10).color(stainlessSteel));

return p.model();
