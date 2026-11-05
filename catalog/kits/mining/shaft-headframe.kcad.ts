// SPDX-License-Identifier: CC0-1.0
// Mine shaft headframe: Steel-look headframe with paired uprights, winding sheaves, and a raised service deck. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "shaft-headframe",
  license: 'CC0-1.0',
  title: "Mine shaft headframe",
  description: "Steel-look headframe with paired uprights, winding sheaves, and a raised service deck. Controls: overall scale, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { structuralSteel: '#666a66', stainlessSteel: '#969f9e' },
  highVisibility: { structuralSteel: '#465159', stainlessSteel: '#c5ccca' },
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

const p=assembly("shaft-headframe");
p.part("base-skid", b(0, 0, 0, 760, 560, 70).color(structuralSteel));
p.part("tower-left", b(-250, 0, 70, 70, 80, 880).color(structuralSteel));
p.part("tower-right", b(250, 0, 70, 70, 80, 880).color(structuralSteel));
p.part("upper-crossbeam", b(0, 0, 900, 650, 100, 85).color(structuralSteel));
p.part("rear-brace", b(0, 220, 470, 590, 55, 45).color(structuralSteel));
p.part("sheave-left", hy(-165, 0, 1010, 100, 125, 12).color(stainlessSteel));
p.part("sheave-right", hy(165, 0, 1010, 100, 125, 12).color(stainlessSteel));
p.part("operator-platform", b(0, -110, 720, 720, 250, 45).color(structuralSteel));

return p.model();
