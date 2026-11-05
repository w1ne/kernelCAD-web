// SPDX-License-Identifier: CC0-1.0
// Mine survey tripod: Survey tripod with three sturdy legs, rotating instrument platform, telescope block, and control panel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-survey-tripod",
  license: 'CC0-1.0',
  title: "Mine survey tripod",
  description: "Survey tripod with three sturdy legs, rotating instrument platform, telescope block, and control panel. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#c08136', { label: 'Coated equipment steel' });
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

const p=assembly("mine-survey-tripod");
p.part("leg-front", b(0, -170, 0, 80, 90, 760).color(structuralSteel));
p.part("leg-left", b(-180, 130, 0, 80, 90, 760).color(structuralSteel));
p.part("leg-right", b(180, 130, 0, 80, 90, 760).color(structuralSteel));
p.part("mounting-plate", c(0, 0, 755, 70, 180, 10).color(stainlessSteel));
p.part("instrument-body", b(0, 0, 825, 330, 230, 155).color(coatedSteel));
p.part("telescope", c(160, 0, 850, 80, 65, 10).color(coatedSteel));
p.part("display", b(0, -125, 890, 130, 28, 80).color(coatedSteel));
p.part("carry-handle", b(0, 0, 980, 210, 90, 35).color(coatedSteel));

return p.model();
