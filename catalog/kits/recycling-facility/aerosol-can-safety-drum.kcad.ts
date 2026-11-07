// SPDX-License-Identifier: CC0-1.0
// Aerosol-can safety drum: a raised-rim containment pallet beneath a cylindrical drum with twin bung fittings. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "aerosol-can-safety-drum",
  license: 'CC0-1.0',
  title: "Aerosol-can safety drum",
  description: "Aerosol-can safety drum: a raised-rim containment pallet beneath a cylindrical drum with twin bung fittings. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#4f7080', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#5a6e74', stainlessSteel: '#9ea7a5' },
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

const p = assembly("aerosol-can-safety-drum");
p.part("spill-pallet", b(0,0,0,1102.5,913.5,120).color(paintedSteel));
p.part("drum-body", c(0,0,120,1250,313.2,12).color(stainlessSteel));
p.part("top-rim", c(0,0,1370,55,330.6,12).color(stainlessSteel));
p.part("bung-a", c(-126.0,0,1430,70,45,10).color(paintedSteel));
p.part("bung-b", c(126.0,0,1430,70,32,10).color(paintedSteel));
p.part("label-band", b(0,-313.2,700.0000000000001,504.0,34,110).color(paintedSteel));
p.part("pallet-foot-left", c(-357.0,0,0,95,48,10).color(stainlessSteel));
p.part("pallet-foot-right", c(357.0,0,0,95,48,10).color(stainlessSteel));

return p.model();
