// SPDX-License-Identifier: CC0-1.0
// Spiral concentrator bank: Gravity separation bank with support column, stacked spiral trays, feed box, and concentrate launders. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "spiral-concentrator",
  license: 'CC0-1.0',
  title: "Spiral concentrator bank",
  description: "Gravity separation bank with support column, stacked spiral trays, feed box, and concentrate launders. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a897', { label: 'Coated equipment steel' });
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

const p=assembly("spiral-concentrator");
p.part("base-skid", b(0, 0, 0, 860, 650, 70).color(structuralSteel));
p.part("central-column", c(0, 0, 70, 1040, 65, 10).color(coatedSteel));
p.part("spiral-tray-0", b(0, 0, 150, 700, 510, 35).color(coatedSteel));
p.part("spiral-tray-1", b(0, 0, 305, 668, 490, 35).color(coatedSteel));
p.part("spiral-tray-2", b(0, 0, 460, 636, 470, 35).color(coatedSteel));
p.part("spiral-tray-3", b(0, 0, 615, 604, 450, 35).color(coatedSteel));
p.part("spiral-tray-4", b(0, 0, 770, 572, 430, 35).color(coatedSteel));
p.part("spiral-tray-5", b(0, 0, 925, 540, 410, 35).color(coatedSteel));
p.part("feed-box", b(-350, 0, 970, 220, 230, 200).color(coatedSteel));
p.part("concentrate-launder", b(360, 0, 75, 160, 620, 80).color(coatedSteel));
p.part("product-spout-a", c(370, -280, 75, 140, 50, 8).color(stainlessSteel));
p.part("product-spout-b", c(370, 280, 75, 140, 50, 8).color(stainlessSteel));

return p.model();
