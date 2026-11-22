// SPDX-License-Identifier: CC0-1.0
// Electromagnetic flow meter: Inline flow meter with a short pipe body, twin flanges and compact electronics head. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "electromagnetic-flow-meter",
  license: 'CC0-1.0',
  title: "Electromagnetic flow meter",
  description: "Inline flow meter with a short pipe body, twin flanges and compact electronics head. Parameters: overall scale and coated equipment steel, stainless steel, instrument glass; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const instrumentGlass = param('instrumentGlass', '#5eb5c1', { label: 'Instrument glass' });
presets({
  weathered: { coatedSteel: '#687b78', stainlessSteel: '#9ca7a6', instrumentGlass: '#548b91' },
  highVisibility: { coatedSteel: '#e5682d', stainlessSteel: '#e1ddd0', instrumentGlass: '#43b4c8' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const section = (radius:number, sides:number) => {
  let outline = path().moveTo(radius * Math.cos(Math.PI / 2), radius * Math.sin(Math.PI / 2));
  for (let k = 1; k < sides; k++) {
    const angle = Math.PI / 2 + (2 * Math.PI * k) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder = (height:number, radius:number, sides:number) => {
  const levels = [0, height * 0.08, height * 0.92, height];
  const radii = [radius * 0.9, radius, radius, radius * 0.9];
  const profiles = levels.map((_, index) => section(radii[index], sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("electromagnetic-flow-meter");
p.part("body",c(0,0,40,620,145,12).color(coatedSteel));
p.part("flange-low",c(0,0,0,40,185,12).color(stainlessSteel));
p.part("flange-high",c(0,0,660,40,185,12).color(stainlessSteel));
p.part("electronics-head",b(0,0,720,240,180,170).color(coatedSteel));
p.part("display",b(0,-95,760,135,18,65).color(instrumentGlass));

return p.model();
