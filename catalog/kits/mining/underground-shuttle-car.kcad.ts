// SPDX-License-Identifier: CC0-1.0
// Underground shuttle car: Low ore shuttle with a deep haul body, operator enclosure, front bumper, and wheel guards. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "underground-shuttle-car",
  license: 'CC0-1.0',
  title: "Underground shuttle car",
  description: "Low ore shuttle with a deep haul body, operator enclosure, front bumper, and wheel guards. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#ba7d34', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
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

const p=assembly("underground-shuttle-car");
p.part("chassis", b(0, 0, 65, 1150, 460, 130).color(structuralSteel));
p.part("ore-body", b(-70, 0, 180, 760, 430, 380).color(coatedSteel));
p.part("body-rim", b(-70, 0, 560, 800, 470, 45).color(coatedSteel));
p.part("operator-cab", b(470, 0, 160, 260, 340, 360).color(coatedSteel));
p.part("cab-roof", b(470, 0, 520, 300, 380, 50).color(coatedSteel));
p.part("front-wheel-set", c(385, 0, 0, 90, 175, 8).color(rubber));
p.part("rear-wheel-set", c(-405, 0, 0, 90, 175, 8).color(rubber));
p.part("front-bumper", b(650, 0, 95, 70, 520, 110).color(rubber));

return p.model();
