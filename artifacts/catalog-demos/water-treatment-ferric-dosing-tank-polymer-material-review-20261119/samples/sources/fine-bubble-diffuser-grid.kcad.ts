// SPDX-License-Identifier: CC0-1.0
// Fine bubble diffuser grid: Rectangular diffuser grid with parallel air laterals, end headers and short support feet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "fine-bubble-diffuser-grid",
  license: 'CC0-1.0',
  title: "Fine bubble diffuser grid",
  description: "Rectangular diffuser grid with parallel air laterals, end headers and short support feet. Parameters: overall scale and coated equipment steel, structural steel, stainless steel, polymer; weathered and highVisibility presets.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const polymer = param('polymer', '#719582', { label: 'Polymer' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', polymer: '#718477' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', polymer: '#e4bd43' },
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

const p=assembly("fine-bubble-diffuser-grid");
p.part("header-left",b(-440,0,60,60,820,60).color(stainlessSteel));
p.part("header-right",b(440,0,60,60,820,60).color(stainlessSteel));
p.part("lateral-0",b(0,-350,60,820,28,28).color(coatedSteel));
p.part("lateral-1",b(0,-250,60,820,28,28).color(coatedSteel));
p.part("lateral-2",b(0,-150,60,820,28,28).color(coatedSteel));
p.part("lateral-3",b(0,-50,60,820,28,28).color(coatedSteel));
p.part("lateral-4",b(0,50,60,820,28,28).color(coatedSteel));
p.part("lateral-5",b(0,150,60,820,28,28).color(coatedSteel));
p.part("lateral-6",b(0,250,60,820,28,28).color(coatedSteel));
p.part("lateral-7",b(0,350,60,820,28,28).color(coatedSteel));
p.part("diffuser-0",c(-330,-350,88,22,18,10).color(polymer));
p.part("diffuser-1",c(-220,-350,88,22,18,10).color(polymer));
p.part("diffuser-2",c(-110,-350,88,22,18,10).color(polymer));
p.part("diffuser-3",c(0,-350,88,22,18,10).color(polymer));
p.part("diffuser-4",c(110,-350,88,22,18,10).color(polymer));
p.part("diffuser-5",c(220,-350,88,22,18,10).color(polymer));
p.part("diffuser-6",c(330,-350,88,22,18,10).color(polymer));
p.part("foot--360",b(-360,0,0,55,60,60).color(structuralSteel));
p.part("foot-360",b(360,0,0,55,60,60).color(structuralSteel));

return p.model();
