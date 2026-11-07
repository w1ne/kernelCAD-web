// SPDX-License-Identifier: CC0-1.0
// Driver check-in booth: a small weighbridge kiosk with front counter, glazing and roof overhang. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "driver-check-in-booth",
  license: 'CC0-1.0',
  title: "Driver check-in booth",
  description: "Driver check-in booth: a small weighbridge kiosk with front counter, glazing and roof overhang. Low-poly visualization prop. Material controls: stainless steel, painted steel, glass, safety amber.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#55766b', { label: 'Painted steel' });
const glass = param('glass', '#4f9ca8', { label: 'Glass' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#5e7265', glass: '#55939a', safetyAmber: '#d9a239' },
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

const p = assembly("driver-check-in-booth");
p.part("floor-skid", b(0,0,0,1050,730,90).color(stainlessSteel));
p.part("rear-wall", b(0,325.0,90,1050,80,1290).color(paintedSteel));
p.part("left-wall", b(-485.0,0,90,80,650,1290).color(paintedSteel));
p.part("right-wall", b(485.0,0,90,80,650,1290).color(paintedSteel));
p.part("front-counter", b(0,-295.0,90,1050,140,524.4).color(paintedSteel));
p.part("roof", b(0,0,1330,1150,830,100).color(paintedSteel));
p.part("window-header", b(0,-290.0,993.5999999999999,756.0,45,55).color(glass));
p.part("service-panel", b(0,-310.0,703.8000000000001,567.0,40,303.6).color(paintedSteel));
p.part("corner-beacon", c(399.0,-277.4,1220,100,45,10).color(safetyAmber));

return p.model();
