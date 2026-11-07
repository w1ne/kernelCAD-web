// SPDX-License-Identifier: CC0-1.0
// Tailings filter press: Plate-and-frame filter press with paired end frames, stacked filter plates, hydraulic ram, and drip tray. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "tailings-filter-press",
  license: 'CC0-1.0',
  title: "Tailings filter press",
  description: "Plate-and-frame filter press with paired end frames, stacked filter plates, hydraulic ram, and drip tray. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#83a865', { label: 'Coated equipment steel' });
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

const p=assembly("tailings-filter-press");
p.part("base-rail-left", b(0, -260, 0, 1250, 75, 90).color(structuralSteel));
p.part("base-rail-right", b(0, 260, 0, 1250, 75, 90).color(structuralSteel));
p.part("fixed-head", b(-560, 0, 90, 90, 600, 750).color(coatedSteel));
p.part("moving-head", b(560, 0, 90, 90, 600, 750).color(coatedSteel));
p.part("filter-plate-0", b(-420, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-1", b(-335, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-2", b(-250, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-3", b(-165, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-4", b(-80, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-5", b(5, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-6", b(90, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-7", b(175, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("filter-plate-8", b(260, 0, 145, 35, 480, 610).color(stainlessSteel));
p.part("hydraulic-ram", c(640, 0, 385, 170, 95, 10).color(stainlessSteel));
p.part("drip-tray", b(0, 0, 100, 1060, 550, 45).color(coatedSteel));
p.part("upper-beam", b(0, 0, 820, 1200, 100, 75).color(structuralSteel));
p.part("control-pedestal", b(-650, -350, 0, 150, 140, 380).color(coatedSteel));

return p.model();
