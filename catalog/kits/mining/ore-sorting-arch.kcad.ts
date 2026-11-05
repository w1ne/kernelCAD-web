// SPDX-License-Identifier: CC0-1.0
// Ore sorting sensor arch: Conveyor inspection arch with sensor heads, side cabinets, belt, and an overhead scanning bar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ore-sorting-arch",
  license: 'CC0-1.0',
  title: "Ore sorting sensor arch",
  description: "Conveyor inspection arch with sensor heads, side cabinets, belt, and an overhead scanning bar. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a894', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
});
const baseZ=125;
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

const p=assembly("ore-sorting-arch");
p.part("belt", b(0, 0, 125, 1100, 420, 60).color(rubber));
p.part("left-leg", b(0, -280, 185, 75, 75, 610).color(structuralSteel));
p.part("right-leg", b(0, 280, 185, 75, 75, 610).color(structuralSteel));
p.part("crossbar", b(0, 0, 760, 700, 90, 85).color(structuralSteel));
p.part("sensor-left", b(-170, 0, 630, 150, 190, 130).color(coatedSteel));
p.part("sensor-right", b(170, 0, 630, 150, 190, 130).color(coatedSteel));
p.part("control-cabinet", b(-490, -300, 130, 190, 160, 350).color(coatedSteel));
p.part("guard-left", b(0, -250, 130, 980, 35, 95).color(structuralSteel));
p.part("guard-right", b(0, 250, 130, 980, 35, 95).color(structuralSteel));
p.part("scan-beacon", c(0, 0, 845, 75, 45, 8).color(coatedSteel));

return p.model();
