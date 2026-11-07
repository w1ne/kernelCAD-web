// SPDX-License-Identifier: CC0-1.0
// Conveyor transfer tower: its support, upper crossbeam and material channel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-transfer-tower",
  license: 'CC0-1.0',
  title: "Conveyor transfer tower",
  description: "Conveyor transfer tower: its support, upper crossbeam and material channel. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#75656d', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#736767', stainlessSteel: '#9ea7a5' },
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
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("conveyor-transfer-tower");
p.part("support-frame-left", b(-353.6,0,0,95,2006.4,580).color(paintedSteel));
p.part("support-frame-right", b(353.6,0,0,95,2006.4,580).color(paintedSteel));
p.part("upper-crossbeam", b(0,0,580,781.9999999999999,125,100).color(stainlessSteel));
p.part("material-channel", b(0,0,301.6,510.0,1641.6,170).color(paintedSteel));
p.part("inspection-hood", b(0,-273.59999999999997,680,612.0,866.4,240).color(paintedSteel));
p.part("discharge-transition", b(0,957.5999999999999,185.6,421.6,340,348.0).color(paintedSteel));
p.part("access-ladder", b(408.0,456.0,0,75,80,522.0).color(stainlessSteel));
p.part("idler", cy(0,-775.2,344.59999999999997,95,319.59999999999997,10).color(paintedSteel));

return p.model();
