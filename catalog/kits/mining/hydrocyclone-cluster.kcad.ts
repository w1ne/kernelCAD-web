// SPDX-License-Identifier: CC0-1.0
// Hydrocyclone cluster: Cyclone manifold with multiple compact separators, feed header, support frame, and underflow collection box. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "hydrocyclone-cluster",
  license: 'CC0-1.0',
  title: "Hydrocyclone cluster",
  description: "Cyclone manifold with multiple compact separators, feed header, support frame, and underflow collection box. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a88d65', { label: 'Coated equipment steel' });
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

const p=assembly("hydrocyclone-cluster");
p.part("base-frame", b(0, 0, 0, 1050, 680, 70).color(structuralSteel));
p.part("header-left", b(-390, 0, 720, 90, 650, 80).color(coatedSteel));
p.part("header-right", b(390, 0, 720, 90, 650, 80).color(coatedSteel));
p.part("cyclone-0", c(-250, 0, 250, 470, 78, 8).color(coatedSteel));
p.part("cyclone-1", c(-125, 0, 250, 470, 78, 8).color(coatedSteel));
p.part("cyclone-2", c(0, 0, 250, 470, 78, 8).color(coatedSteel));
p.part("cyclone-3", c(125, 0, 250, 470, 78, 8).color(coatedSteel));
p.part("cyclone-4", c(250, 0, 250, 470, 78, 8).color(coatedSteel));
p.part("underflow-box", b(0, 0, 100, 900, 480, 120).color(coatedSteel));
p.part("crossbeam", b(0, 0, 680, 980, 65, 75).color(structuralSteel));
p.part("feed-header", c(0, -365, 690, 100, 48, 8).color(coatedSteel));
p.part("service-platform", b(0, 365, 380, 1000, 140, 45).color(structuralSteel));

return p.model();
