// SPDX-License-Identifier: CC0-1.0
// Flotation cell bank: Three-cell flotation bank with connected tank bodies, central drive housings, and access walkway. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "flotation-cell-bank",
  license: 'CC0-1.0',
  title: "Flotation cell bank",
  description: "Three-cell flotation bank with connected tank bodies, central drive housings, and access walkway. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a89e', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159' },
});
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
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
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("flotation-cell-bank");
p.part("base-skid", b(0, 0, 0, 1420, 620, 75).color(structuralSteel));
p.part("cell-0", c(-440, 0, 75, 470, 205, 10).color(coatedSteel));
p.part("cell-1", c(0, 0, 75, 470, 205, 10).color(coatedSteel));
p.part("cell-2", c(440, 0, 75, 470, 205, 10).color(coatedSteel));
p.part("motor-0", b(-440, 0, 545, 150, 150, 185).color(coatedSteel));
p.part("motor-1", b(0, 0, 545, 150, 150, 185).color(coatedSteel));
p.part("motor-2", b(440, 0, 545, 150, 150, 185).color(coatedSteel));
p.part("walkway", b(0, 340, 575, 1410, 150, 55).color(structuralSteel));
p.part("front-rail", b(0, 420, 635, 1370, 35, 40).color(structuralSteel));
p.part("launder-left", c(-650, 0, 560, 75, 245, 8).color(coatedSteel));
p.part("launder-right", c(650, 0, 560, 75, 245, 8).color(coatedSteel));

return p.model();
