// SPDX-License-Identifier: CC0-1.0
// Exploration core tray rack: Stackable core sample rack with three levels, long trays, end uprights, and top bracing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "core-tray-rack",
  license: 'CC0-1.0',
  title: "Exploration core tray rack",
  description: "Stackable core sample rack with three levels, long trays, end uprights, and top bracing. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a88248', { label: 'Coated equipment steel' });
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

const p=assembly("core-tray-rack");
p.part("base-left", b(-430, 0, 0, 70, 420, 85).color(structuralSteel));
p.part("base-right", b(430, 0, 0, 70, 420, 85).color(structuralSteel));
p.part("base-crossbar", b(0, 0, 0, 920, 70, 70).color(structuralSteel));
p.part("core-tray-0", b(0, 0, 110, 850, 360, 75).color(coatedSteel));
p.part("core-tray-1", b(0, 0, 350, 850, 360, 75).color(coatedSteel));
p.part("core-tray-2", b(0, 0, 590, 850, 360, 75).color(coatedSteel));
p.part("core-channel-0-0", b(-350, 0, 150, 28, 330, 25).color(coatedSteel));
p.part("core-channel-0-1", b(-210, 0, 150, 28, 330, 25).color(coatedSteel));
p.part("core-channel-0-2", b(-70, 0, 150, 28, 330, 25).color(coatedSteel));
p.part("core-channel-0-3", b(70, 0, 150, 28, 330, 25).color(coatedSteel));
p.part("core-channel-0-4", b(210, 0, 150, 28, 330, 25).color(coatedSteel));
p.part("core-channel-1-0", b(-350, 0, 390, 28, 330, 25).color(coatedSteel));
p.part("core-channel-1-1", b(-210, 0, 390, 28, 330, 25).color(coatedSteel));
p.part("core-channel-1-2", b(-70, 0, 390, 28, 330, 25).color(coatedSteel));
p.part("core-channel-1-3", b(70, 0, 390, 28, 330, 25).color(coatedSteel));
p.part("core-channel-1-4", b(210, 0, 390, 28, 330, 25).color(coatedSteel));
p.part("core-channel-2-0", b(-350, 0, 630, 28, 330, 25).color(coatedSteel));
p.part("core-channel-2-1", b(-210, 0, 630, 28, 330, 25).color(coatedSteel));
p.part("core-channel-2-2", b(-70, 0, 630, 28, 330, 25).color(coatedSteel));
p.part("core-channel-2-3", b(70, 0, 630, 28, 330, 25).color(coatedSteel));
p.part("core-channel-2-4", b(210, 0, 630, 28, 330, 25).color(coatedSteel));
p.part("upright-left", b(-430, 0, 75, 60, 70, 800).color(structuralSteel));
p.part("upright-right", b(430, 0, 75, 60, 70, 800).color(structuralSteel));
p.part("top-crossbar", b(0, 0, 850, 920, 70, 65).color(structuralSteel));
p.part("lifting-eye-left", c(-430, 0, 915, 45, 35, 8).color(coatedSteel));
p.part("lifting-eye-right", c(430, 0, 915, 45, 35, 8).color(coatedSteel));

return p.model();
