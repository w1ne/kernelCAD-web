// SPDX-License-Identifier: CC0-1.0
// Landfill monitoring pedestal: its concrete plinth, equipment cabinet and display face. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "landfill-monitoring-pedestal",
  license: 'CC0-1.0',
  title: "Landfill monitoring pedestal",
  description: "Landfill monitoring pedestal: its concrete plinth, equipment cabinet and display face. Low-poly visualization prop. Material controls: concrete, painted steel, glass, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#7c6955', { label: 'Painted steel' });
const glass = param('glass', '#4f9ca8', { label: 'Glass' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#786a56', glass: '#55939a', stainlessSteel: '#9ea7a5' },
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

const p = assembly("landfill-monitoring-pedestal");
p.part("concrete-plinth", b(0,0,0,760,840,110).color(concrete));
p.part("equipment-cabinet", b(0,0,110,547.1999999999999,537.6,804.6).color(paintedSteel));
p.part("display-face", b(0,-285.6,581.1,334.4,55,327.8).color(glass));
p.part("sensor-mast", b(228.0,210.0,110,80,80,1102.6).color(paintedSteel));
p.part("weather-hood", b(0,0,1043.0,684.0,672.0,80).color(paintedSteel));
p.part("sensor-dish", c(228.0,210.0,1311.2,140,90,10).color(paintedSteel));
p.part("sample-port", c(-228.0,-285.6,150,100,28,10).color(paintedSteel));
p.part("service-handle", cy(304.0,-327.6,447.0,100,28,10).color(stainlessSteel));

return p.model();
