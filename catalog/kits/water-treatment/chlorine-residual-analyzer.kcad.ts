// SPDX-License-Identifier: CC0-1.0
// Residual chlorine analyzer: Instrument stand with analyzer head, sample cabinet, status panel and inlet tubing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "chlorine-residual-analyzer",
  license: 'CC0-1.0',
  title: "Residual chlorine analyzer",
  description: "Instrument stand with analyzer head, sample cabinet, status panel and inlet tubing. Parameters: overall scale and coated equipment steel, structural steel, instrument glass; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const instrumentGlass = param('instrumentGlass', '#5eb5c1', { label: 'Instrument glass' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', instrumentGlass: '#548b91' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', instrumentGlass: '#43b4c8' },
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

const p=assembly("chlorine-residual-analyzer");
p.part("base",b(0,0,0,500,360,50).color(structuralSteel));
p.part("cabinet",b(0,0,285,400,260,520).color(coatedSteel));
p.part("head",b(0,0,665,360,230,210).color(coatedSteel));
p.part("display",b(0,-120,695,190,18,90).color(instrumentGlass));
p.part("sample-line",c(150,0,65,410,24,10).color(coatedSteel));
p.part("support-post",b(0,0,25,45,45,240).color(structuralSteel));

return p.model();
