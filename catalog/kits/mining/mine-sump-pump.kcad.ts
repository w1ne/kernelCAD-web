// SPDX-License-Identifier: CC0-1.0
// Mine sump pump: Submersible mine pump with screened intake, motor housing, lifting bail, cable, and discharge outlet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-sump-pump",
  license: 'CC0-1.0',
  title: "Mine sump pump",
  description: "Submersible mine pump with screened intake, motor housing, lifting bail, cable, and discharge outlet. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a87d', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
});
const baseZ=25;
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

const p=assembly("mine-sump-pump");
p.part("motor-body", c(0, 0, 80, 470, 160, 12).color(coatedSteel));
p.part("pump-head", c(0, 0, 550, 100, 130, 10).color(coatedSteel));
p.part("intake-foot", b(0, 0, 25, 280, 280, 55).color(structuralSteel));
p.part("screen-guard-front", b(0, -145, 55, 235, 28, 260).color(structuralSteel));
p.part("screen-guard-back", b(0, 145, 55, 235, 28, 260).color(structuralSteel));
p.part("handle-left", b(-95, 0, 555, 35, 40, 155).color(coatedSteel));
p.part("handle-right", b(95, 0, 555, 35, 40, 155).color(coatedSteel));
p.part("discharge-nozzle", c(0, -180, 520, 130, 70, 8).color(stainlessSteel));
p.part("power-cable", b(120, 0, 645, 32, 32, 240).color(rubber));
p.part("cable-entry", c(120, 0, 850, 55, 42, 8).color(rubber));

return p.model();
