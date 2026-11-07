// SPDX-License-Identifier: CC0-1.0
// Chemical storage tank: Vertical chemical storage tank with conical-look top, access hatch and containment curb. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "chemical-storage-tank",
  license: 'CC0-1.0',
  title: "Chemical storage tank",
  description: "Vertical chemical storage tank with conical-look top, access hatch and containment curb. Parameters: overall scale and coated equipment steel, stainless steel, instrument glass; weathered and highVisibility presets.",
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

const p=assembly("chemical-storage-tank");
p.part("containment",c(0,0,0,55,390,12).color(coatedSteel));
p.part("tank",c(0,0,55,860,310,12).color(coatedSteel));
p.part("roof",c(0,0,915,110,285,12).color(coatedSteel));
p.part("hatch",c(0,0,1025,50,90,10).color(coatedSteel));
p.part("level-strip",b(0,-315,250,45,20,420).color(instrumentGlass));
p.part("drain",b(0,0,40,120,120,70).color(stainlessSteel));

return p.model();
