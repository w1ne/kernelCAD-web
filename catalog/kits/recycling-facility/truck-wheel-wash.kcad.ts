// SPDX-License-Identifier: CC0-1.0
// Truck wheel-wash station: an overhead wash arch with a cross-manifold and spaced spray nozzles. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "truck-wheel-wash",
  license: 'CC0-1.0',
  title: "Truck wheel-wash station",
  description: "Truck wheel-wash station: an overhead wash arch with a cross-manifold and spaced spray nozzles. Low-poly visualization prop. Material controls: concrete, painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#898b83', { label: 'Concrete' });
const paintedSteel = param('paintedSteel', '#55766b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#84857b', paintedSteel: '#5e7265', stainlessSteel: '#9ea7a5' },
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

const p = assembly("truck-wheel-wash");
p.part("wash-pad", b(0,0,0,2363.0,1050.0,140).color(concrete));
p.part("arch-left-leg", b(-806.1999999999999,0,140,130,140,1240).color(paintedSteel));
p.part("arch-right-leg", b(806.1999999999999,0,140,130,140,1240).color(paintedSteel));
p.part("arch-header", b(0,0,1260,150,1008.0,160).color(paintedSteel));
p.part("spray-manifold", b(0,0,1090,100,756.0,65).color(stainlessSteel));
p.part("spray-nozzle-a", c(-556.0,-336.0,1030,130,25,10).color(stainlessSteel));
p.part("spray-nozzle-b", c(0,-336.0,1030,130,25,10).color(stainlessSteel));
p.part("spray-nozzle-c", c(556.0,-336.0,1030,130,25,10).color(stainlessSteel));

return p.model();
