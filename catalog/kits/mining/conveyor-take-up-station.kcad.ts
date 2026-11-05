// SPDX-License-Identifier: CC0-1.0
// Conveyor take-up station: Belt take-up frame with paired guide rails, tension carriage, counterweight block, and return drum. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-take-up-station",
  license: 'CC0-1.0',
  title: "Conveyor take-up station",
  description: "Belt take-up frame with paired guide rails, tension carriage, counterweight block, and return drum. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#74a865', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca' },
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("conveyor-take-up-station");
p.part("base", b(0, 0, 0, 1050, 680, 70).color(structuralSteel));
p.part("rail-left", b(0, -250, 70, 900, 65, 100).color(structuralSteel));
p.part("rail-right", b(0, 250, 70, 900, 65, 100).color(structuralSteel));
p.part("tower-left", b(-390, -250, 170, 75, 75, 600).color(structuralSteel));
p.part("tower-right", b(-390, 250, 170, 75, 75, 600).color(structuralSteel));
p.part("counterweight", b(0, 0, 80, 400, 430, 350).color(coatedSteel));
p.part("carriage", b(360, 0, 210, 260, 500, 180).color(coatedSteel));
p.part("take-up-drum", hy(440, 0, 450, 540, 95, 10).color(stainlessSteel));
p.part("guardrail", b(-390, 0, 790, 820, 45, 45).color(structuralSteel));

return p.model();
