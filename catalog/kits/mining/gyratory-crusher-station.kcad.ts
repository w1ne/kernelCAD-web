// SPDX-License-Identifier: CC0-1.0
// Gyratory crusher station: Tall primary crusher station with portal frame, upper feed ring, main shell, and discharge opening. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "gyratory-crusher-station",
  license: 'CC0-1.0',
  title: "Gyratory crusher station",
  description: "Tall primary crusher station with portal frame, upper feed ring, main shell, and discharge opening. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a865', { label: 'Coated equipment steel' });
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

const p=assembly("gyratory-crusher-station");
p.part("foundation", b(0, 0, 0, 1280, 980, 110).color(structuralSteel));
p.part("column-left", b(-480, 0, 110, 145, 760, 1050).color(coatedSteel));
p.part("column-right", b(480, 0, 110, 145, 760, 1050).color(coatedSteel));
p.part("rear-column", b(0, 360, 110, 900, 150, 1050).color(coatedSteel));
p.part("crusher-shell", c(0, 0, 140, 790, 360, 12).color(coatedSteel));
p.part("feed-ring", c(0, 0, 900, 170, 520, 12).color(stainlessSteel));
p.part("top-bridge", b(0, 0, 1060, 1160, 220, 100).color(structuralSteel));
p.part("discharge-chute", b(0, -430, 160, 480, 220, 260).color(stainlessSteel));

return p.model();
