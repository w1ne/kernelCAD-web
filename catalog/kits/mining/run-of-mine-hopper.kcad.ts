// SPDX-License-Identifier: CC0-1.0
// Run-of-mine feed hopper: Large feed hopper with reinforced rim, four support legs, and a central discharge throat. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "run-of-mine-hopper",
  license: 'CC0-1.0',
  title: "Run-of-mine feed hopper",
  description: "Large feed hopper with reinforced rim, four support legs, and a central discharge throat. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89665', { label: 'Coated equipment steel' });
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

const p=assembly("run-of-mine-hopper");
p.part("throat", b(0, 0, 40, 420, 380, 210).color(coatedSteel));
p.part("hopper-front", b(0, -250, 180, 880, 80, 440).color(coatedSteel));
p.part("hopper-back", b(0, 250, 180, 880, 80, 440).color(coatedSteel));
p.part("hopper-left", b(-400, 0, 180, 80, 420, 440).color(coatedSteel));
p.part("hopper-right", b(400, 0, 180, 80, 420, 440).color(coatedSteel));
p.part("leg-left-front", b(-360, -220, 0, 80, 80, 180).color(structuralSteel));
p.part("leg-right-front", b(360, -220, 0, 80, 80, 180).color(structuralSteel));
p.part("leg-left-back", b(-360, 220, 0, 80, 80, 180).color(structuralSteel));
p.part("leg-right-back", b(360, 220, 0, 80, 80, 180).color(structuralSteel));
p.part("gate-shaft", c(0, 0, 0, 95, 155, 8).color(stainlessSteel));

return p.model();
