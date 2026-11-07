// SPDX-License-Identifier: CC0-1.0
// Dust-suppression mist cannon: its mobile chassis, turntable and elevation. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "dust-suppression-mist-cannon",
  license: 'CC0-1.0',
  title: "Dust-suppression mist cannon",
  description: "Dust-suppression mist cannon: its mobile chassis, turntable and elevation. Low-poly visualization prop. Material controls: painted steel, stainless steel, rubber.",
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
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("dust-suppression-mist-cannon");
p.part("mobile-chassis", b(0,0,0,760,730,120).color(paintedSteel));
p.part("turntable", b(0,0,120,350,350,120).color(paintedSteel));
p.part("elevation-frame-left", b(-170,0,240,65,65,547.4000000000001).color(paintedSteel));
p.part("elevation-frame-right", b(170,0,240,65,65,547.4000000000001).color(paintedSteel));
p.part("spray-barrel", cy(0,0,676.1999999999999,547.1999999999999,105,10).color(paintedSteel));
p.part("fan-hub", c(0,-189.8,676.1999999999999,170,145,10).color(paintedSteel));
p.part("fan-ring", c(0,-189.8,676.1999999999999,90,220,10).color(stainlessSteel));
p.part("wheel-left", c(-266.0,292.0,0,180,75,10).color(rubber));
p.part("wheel-right", c(266.0,292.0,0,180,75,10).color(rubber));

return p.model();
