// SPDX-License-Identifier: CC0-1.0
// Near-infrared sorter: an overhead sensor arch and paired camera pods above the conveyor belt. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "near-infrared-sorter",
  license: 'CC0-1.0',
  title: "Near-infrared sorter",
  description: "Near-infrared sorter: an overhead sensor arch and paired camera pods above the conveyor belt. Low-poly visualization prop. Material controls: painted steel, rubber, glass, safety amber.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#506c68', { label: 'Painted steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
const glass = param('glass', '#4f9ca8', { label: 'Glass' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
presets({
  weathered: { paintedSteel: '#5a6c63', rubber: '#3c403e', glass: '#55939a', safetyAmber: '#d9a239' },
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

const p = assembly("near-infrared-sorter");
p.part("belt-frame", b(0,0,0,780,2020,180).color(paintedSteel));
p.part("belt-surface", b(0,0,180,670.8,1919.0,55).color(rubber));
p.part("support-left-front", b(-327.59999999999997,-767.6,0,65,65,500).color(paintedSteel));
p.part("support-right-front", b(327.59999999999997,-767.6,0,65,65,500).color(paintedSteel));
p.part("support-left-back", b(-327.59999999999997,767.6,0,65,65,500).color(paintedSteel));
p.part("support-right-back", b(327.59999999999997,767.6,0,65,65,500).color(paintedSteel));
p.part("sensor-arch-left", b(-452.4,0,500,85,100,850).color(paintedSteel));
p.part("sensor-arch-right", b(452.4,0,500,85,100,850).color(paintedSteel));
p.part("sensor-bridge", b(0,0,1280,998.4,110,95).color(paintedSteel));
p.part("camera-pod-a", b(-195.0,0,1350,160,150,150).color(glass));
p.part("camera-pod-b", b(195.0,0,1350,160,150,150).color(glass));
p.part("indicator", c(0,-707.0,1250,95,42,10).color(safetyAmber));

return p.model();
