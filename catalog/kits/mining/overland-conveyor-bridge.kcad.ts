// SPDX-License-Identifier: CC0-1.0
// Overland conveyor bridge: Elevated conveyor gallery with long belt trough, portal supports, and crossed structural braces. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "overland-conveyor-bridge",
  license: 'CC0-1.0',
  title: "Overland conveyor bridge",
  description: "Elevated conveyor gallery with long belt trough, portal supports, and crossed structural braces. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#77a865', { label: 'Coated equipment steel' });
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("overland-conveyor-bridge");
p.part("belt", b(0, 0, 490, 1800, 270, 70).color(rubber));
p.part("left-stringer", b(0, -150, 430, 1800, 55, 90).color(structuralSteel));
p.part("right-stringer", b(0, 150, 430, 1800, 55, 90).color(structuralSteel));
p.part("portal-leg--610--190", b(-610, -190, 0, 70, 70, 430).color(structuralSteel));
p.part("portal-leg--610-190", b(-610, 190, 0, 70, 70, 430).color(structuralSteel));
p.part("portal-leg-610--190", b(610, -190, 0, 70, 70, 430).color(structuralSteel));
p.part("portal-leg-610-190", b(610, 190, 0, 70, 70, 430).color(structuralSteel));
p.part("portal-top-left", b(-610, 0, 420, 80, 430, 70).color(structuralSteel));
p.part("portal-top-right", b(610, 0, 420, 80, 430, 70).color(structuralSteel));
p.part("cross-brace-front", b(0, -180, 180, 1180, 40, 40).color(structuralSteel));
p.part("cross-brace-back", b(0, 180, 180, 1180, 40, 40).color(structuralSteel));
p.part("idler-left", hy(-600, 0, 455, 320, 55, 10).color(coatedSteel));
p.part("idler-right", hy(600, 0, 455, 320, 55, 10).color(coatedSteel));

return p.model();
