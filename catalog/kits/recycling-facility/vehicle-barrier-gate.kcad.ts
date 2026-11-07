// SPDX-License-Identifier: CC0-1.0
// Vehicle barrier gate: a counterweighted barrier boom with a hinge drum and visible signal beacon. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "vehicle-barrier-gate",
  license: 'CC0-1.0',
  title: "Vehicle barrier gate",
  description: "Vehicle barrier gate: a counterweighted barrier boom with a hinge drum and visible signal beacon. Low-poly visualization prop. Material controls: painted steel, safety amber, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "reception", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5d6985', { label: 'Painted steel' });
const safetyAmber = param('safetyAmber', '#f0ae32', { label: 'Safety amber' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#636a77', safetyAmber: '#d9a239', stainlessSteel: '#9ea7a5' },
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

const p = assembly("vehicle-barrier-gate");
p.part("control-pedestal", b(-450.0,0,0,320,460,923.8).color(paintedSteel));
p.part("counterweight-box", b(-450.0,0,923.8,360,500,120).color(paintedSteel));
p.part("boom-arm", b(220,0,998.3000000000001,1220,90,90).color(paintedSteel));
p.part("boom-tip", b(820.0,0,998.3000000000001,110,115,110).color(safetyAmber));
p.part("photo-eye-post", b(790.0,-420.0,0,75,75,804.6).color(stainlessSteel));
p.part("beacon", c(-450.0,-200,923.8,110,54,10).color(safetyAmber));
p.part("hinge-drum", c(-290.0,0,938.7,130,70,10).color(stainlessSteel));

return p.model();
