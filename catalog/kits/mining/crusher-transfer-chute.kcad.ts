// SPDX-License-Identifier: CC0-1.0
// Crusher transfer chute: Enclosed transfer chute with upper feed throat, lower discharge neck, support legs, and inspection cover. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "crusher-transfer-chute",
  license: 'CC0-1.0',
  title: "Crusher transfer chute",
  description: "Enclosed transfer chute with upper feed throat, lower discharge neck, support legs, and inspection cover. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89e65', { label: 'Coated equipment steel' });
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

const p=assembly("crusher-transfer-chute");
p.part("top-flange", b(0, 0, 640, 760, 600, 65).color(coatedSteel));
p.part("front-wall", b(0, -250, 340, 720, 55, 560).color(coatedSteel));
p.part("back-wall", b(0, 250, 340, 720, 55, 560).color(coatedSteel));
p.part("left-wall", b(-330, 0, 340, 55, 450, 560).color(coatedSteel));
p.part("right-wall", b(330, 0, 340, 55, 450, 560).color(coatedSteel));
p.part("discharge-neck", b(0, 0, 80, 330, 330, 260).color(stainlessSteel));
p.part("inspection-cover", b(0, -290, 445, 250, 35, 180).color(coatedSteel));
p.part("leg-left", b(-360, -260, 0, 65, 65, 280).color(structuralSteel));
p.part("leg-right", b(360, 260, 0, 65, 65, 280).color(structuralSteel));
p.part("access-boss", c(0, -320, 500, 70, 70, 8).color(coatedSteel));

return p.model();
