// SPDX-License-Identifier: CC0-1.0
// Twin-shaft shredder: twin cutting shafts between the feed hopper and discharge chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "twin-shaft-shredder",
  license: 'CC0-1.0',
  title: "Twin-shaft shredder",
  description: "Twin-shaft shredder: twin cutting shafts between the feed hopper and discharge chute. Low-poly visualization prop. Material controls: painted steel, stainless steel, safety amber.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5f7380', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#647074', stainlessSteel: '#9ea7a5', safetyAmber: '#d9a239' },
  highVisibility: { paintedSteel: '#d77632', safetyAmber: '#ffd044' },
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

const p = assembly("twin-shaft-shredder");
p.part("base-frame", b(0,0,0,1050,850,170).color(paintedSteel));
p.part("cutting-housing", b(0,0,170,840.0,595.0,868.0000000000001).color(paintedSteel));
p.part("feed-hopper-front", b(0,-357.0,868.0000000000001,924.0,272.0,620.0).color(paintedSteel));
p.part("feed-lip", b(0,-467.50000000000006,852.5000000000001,945.0,130,85).color(paintedSteel));
p.part("discharge-chute", b(0,357.0,170,651.0,204.0,542.5).color(paintedSteel));
p.part("cutting-shaft-a", cy(-210.0,0,527.0,492.99999999999994,95,12).color(stainlessSteel));
p.part("cutting-shaft-b", cy(210.0,0,527.0,492.99999999999994,95,12).color(stainlessSteel));
p.part("side-service-panel", b(441.0,0,434.00000000000006,75,374.0,558.0).color(paintedSteel));
p.part("drive-motor", c(598.5,221.0,210,330,135,10).color(paintedSteel));
p.part("warning-beacon", c(-399.0,-255.0,1302.0,105,45,10).color(safetyAmber));

return p.model();
