// SPDX-License-Identifier: CC0-1.0
// Mine ventilation fan station: Compact fan station with intake plenum, motor block, guarded housing, and raised support frame. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-ventilation-fan",
  license: 'CC0-1.0',
  title: "Mine ventilation fan station",
  description: "Compact fan station with intake plenum, motor block, guarded housing, and raised support frame. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a896', { label: 'Coated equipment steel' });
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

const p=assembly("mine-ventilation-fan");
p.part("base-skid", b(0, 0, 0, 850, 550, 60).color(structuralSteel));
p.part("left-support", b(-290, 0, 60, 70, 500, 280).color(structuralSteel));
p.part("right-support", b(290, 0, 60, 70, 500, 280).color(structuralSteel));
p.part("fan-housing", c(0, 0, 180, 360, 245, 12).color(coatedSteel));
p.part("inlet-ring", c(0, 0, 540, 65, 285, 12).color(stainlessSteel));
p.part("motor", b(-390, 0, 140, 240, 260, 230).color(coatedSteel));
p.part("outlet-plenum", b(0, 0, 545, 540, 540, 100).color(coatedSteel));
p.part("service-platform", b(0, -355, 280, 800, 110, 45).color(structuralSteel));

return p.model();
