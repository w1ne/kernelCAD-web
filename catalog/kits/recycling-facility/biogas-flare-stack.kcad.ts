// SPDX-License-Identifier: CC0-1.0
// Biogas flare stack: its mounting pad, riser pipe and flare stack. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "biogas-flare-stack",
  license: 'CC0-1.0',
  title: "Biogas flare stack",
  description: "Biogas flare stack: its mounting pad, riser pipe and flare stack. Low-poly visualization prop. Material controls: painted steel, stainless steel, rubber.",
  tags: ["recycling", "materials recovery", "waste management", "organics", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#82714c', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#7c6f50', stainlessSteel: '#9ea7a5', rubber: '#3c403e' },
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

const p = assembly("biogas-flare-stack");
p.part("mounting-pad", b(0,0,0,1000,840,120).color(paintedSteel));
p.part("riser-pipe", c(0,0,120,1211.0,95,10).color(stainlessSteel));
p.part("flare-stack", c(0,0,1384.0,484.40000000000003,145,10).color(paintedSteel));
p.part("service-box", b(350.0,-285.6,150,240,210,380).color(paintedSteel));
p.part("valve-wheel", c(0,-285.6,260,50,150,10).color(rubber));
p.part("horizontal-connection", cy(0,285.6,180,320,55,10).color(paintedSteel));

return p.model();
