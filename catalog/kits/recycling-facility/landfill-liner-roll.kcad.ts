// SPDX-License-Identifier: CC0-1.0
// Landfill liner roll: its roll cradle, liner roll and end core. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "landfill-liner-roll",
  license: 'CC0-1.0',
  title: "Landfill liner roll",
  description: "Landfill liner roll: its roll cradle, liner roll and end core. Low-poly visualization prop. Material controls: painted steel, rubber.",
  tags: ["recycling", "materials recovery", "waste management", "residuals", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#7c6955', { label: 'Painted steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#786a56', rubber: '#3c403e' },
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

const p = assembly("landfill-liner-roll");
p.part("roll-cradle-left", b(-360.0,0,0,110,584.0,745.0).color(paintedSteel));
p.part("roll-cradle-right", b(360.0,0,0,110,584.0,745.0).color(paintedSteel));
p.part("liner-roll", cy(0,0,715.1999999999999,660.0,596.0,12).color(rubber));
p.part("end-core-left", c(-360.0,0,715.1999999999999,90,110,10).color(paintedSteel));
p.part("end-core-right", c(360.0,0,715.1999999999999,90,110,10).color(paintedSteel));
p.part("loose-liner", b(0,-255.49999999999997,0,800.0,160,55).color(paintedSteel));
p.part("pull-bar", b(0,-270.1,55,820.0,60,65).color(paintedSteel));

return p.model();
