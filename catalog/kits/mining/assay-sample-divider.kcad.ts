// SPDX-License-Identifier: CC0-1.0
// Assay sample divider: Bench sample divider with feed hopper, splitting chute, collection bins, and compact drive enclosure. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "assay-sample-divider",
  license: 'CC0-1.0',
  title: "Assay sample divider",
  description: "Bench sample divider with feed hopper, splitting chute, collection bins, and compact drive enclosure. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89465', { label: 'Coated equipment steel' });
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

const p=assembly("assay-sample-divider");
p.part("base", b(0, 0, 0, 740, 520, 70).color(structuralSteel));
p.part("left-bin", b(-210, -120, 70, 280, 220, 230).color(coatedSteel));
p.part("right-bin", b(210, -120, 70, 280, 220, 230).color(coatedSteel));
p.part("support-post-left", b(-255, 0, 300, 65, 65, 300).color(structuralSteel));
p.part("support-post-right", b(255, 0, 300, 65, 65, 300).color(structuralSteel));
p.part("splitter-housing", b(0, 0, 365, 380, 300, 160).color(coatedSteel));
p.part("feed-hopper", b(0, 0, 525, 300, 240, 240).color(coatedSteel));
p.part("rotary-splitter", c(0, 0, 290, 75, 145, 10).color(coatedSteel));
p.part("drive-box", b(0, 225, 190, 170, 130, 210).color(coatedSteel));
p.part("collection-lip", b(0, -260, 90, 550, 45, 55).color(coatedSteel));

return p.model();
