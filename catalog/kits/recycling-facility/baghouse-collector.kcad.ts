// SPDX-License-Identifier: CC0-1.0
// Baghouse collector: four upright filter canisters connected to a low ducted cabinet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "baghouse-collector",
  license: 'CC0-1.0',
  title: "Baghouse collector",
  description: "Baghouse collector: four upright filter canisters connected to a low ducted cabinet. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#7d6752', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#796854', stainlessSteel: '#9ea7a5' },
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

const p = assembly("baghouse-collector");
p.part("service-base", b(0,0,0,1310,850,110).color(paintedSteel));
p.part("filter-cabinet", b(0,0,110,1113.5,646.0,1116.0).color(paintedSteel));
p.part("access-door-left", b(-288.2,-357.0,220,445.40000000000003,65,697.5).color(stainlessSteel));
p.part("access-door-right", b(288.2,-357.0,220,445.40000000000003,65,697.5).color(paintedSteel));
p.part("inlet-duct", b(0,-484.49999999999994,1054.0,497.8,240,280).color(paintedSteel));
p.part("outlet-duct", b(0,467.50000000000006,1178.0,419.2,250,360).color(paintedSteel));
p.part("support-leg-left", b(-393.0,255.0,0,85,85,350).color(paintedSteel));
p.part("support-leg-right", b(393.0,255.0,0,85,85,350).color(paintedSteel));
p.part("filter-canister-1", c(-445.40000000000003,68.0,1271.0,300,70,10).color(paintedSteel));
p.part("filter-canister-2", c(-157.20000000000005,68.0,1271.0,300,70,10).color(paintedSteel));
p.part("filter-canister-3", c(130.99999999999994,68.0,1271.0,300,70,10).color(paintedSteel));
p.part("filter-canister-4", c(419.1999999999999,68.0,1271.0,300,70,10).color(paintedSteel));

return p.model();
