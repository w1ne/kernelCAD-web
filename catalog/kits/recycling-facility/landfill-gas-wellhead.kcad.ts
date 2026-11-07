// SPDX-License-Identifier: CC0-1.0
// Landfill gas wellhead: its surface pad, well casing and head collar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "landfill-gas-wellhead",
  license: 'CC0-1.0',
  title: "Landfill gas wellhead",
  description: "Landfill gas wellhead: its surface pad, well casing and head collar. Low-poly visualization prop. Material controls: painted steel, stainless steel, rubber.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5c6c7b', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#626c70', stainlessSteel: '#9ea7a5', rubber: '#3c403e' },
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

const p = assembly("landfill-gas-wellhead");
p.part("surface-pad", b(0,0,0,1260.0,912.0,90).color(paintedSteel));
p.part("well-casing", c(0,0,90,1127.0,325.5,12).color(paintedSteel));
p.part("head-collar", c(0,0,1217.0,95,378.0,12).color(stainlessSteel));
p.part("instrument-bridge", b(0,0,1312.0,735.0,95,75).color(paintedSteel));
p.part("sampling-port", c(315.0,0,160,280,35,10).color(paintedSteel));
p.part("valve-wheel", c(-294.0,-228.0,170,55,125,10).color(rubber));
p.part("protective-post-left", b(-514.5,0,0,70,70,500).color(stainlessSteel));
p.part("protective-post-right", b(514.5,0,0,70,70,500).color(stainlessSteel));

return p.model();
