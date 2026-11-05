// SPDX-License-Identifier: CC0-1.0
// Ore-pass grizzly gate: Heavy inclined-look grizzly panel in a service frame with parallel bars and side drive housings. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ore-pass-grizzly",
  license: 'CC0-1.0',
  title: "Ore-pass grizzly gate",
  description: "Heavy inclined-look grizzly panel in a service frame with parallel bars and side drive housings. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#80a865', { label: 'Coated equipment steel' });
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
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("ore-pass-grizzly");
p.part("lower-frame", b(0, 0, 0, 1020, 700, 80).color(structuralSteel));
p.part("side-left", b(-465, 0, 70, 90, 700, 480).color(coatedSteel));
p.part("side-right", b(465, 0, 70, 90, 700, 480).color(coatedSteel));
p.part("grizzly-bar-0", b(-340, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-1", b(-255, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-2", b(-170, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-3", b(-85, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-4", b(0, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-5", b(85, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-6", b(170, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-7", b(255, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("grizzly-bar-8", b(340, 0, 130, 34, 620, 390).color(stainlessSteel));
p.part("drive-left", c(-500, 0, 120, 180, 90, 8).color(coatedSteel));
p.part("drive-right", c(500, 0, 120, 180, 90, 8).color(coatedSteel));
p.part("upper-crossbar", b(0, 0, 500, 1120, 80, 75).color(structuralSteel));

return p.model();
