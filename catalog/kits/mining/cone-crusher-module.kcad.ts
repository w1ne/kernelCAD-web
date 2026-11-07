// SPDX-License-Identifier: CC0-1.0
// Cone crusher module: Cone crushing station with feed hopper, nested crusher body, access deck, and drive cabinet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "cone-crusher-module",
  license: 'CC0-1.0',
  title: "Cone crusher module",
  description: "Cone crushing station with feed hopper, nested crusher body, access deck, and drive cabinet. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a88f', { label: 'Coated equipment steel' });
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

const p=assembly("cone-crusher-module");
p.part("base-skid", b(0, 0, 0, 920, 720, 80).color(structuralSteel));
p.part("support-left", b(-310, 0, 80, 110, 600, 650).color(structuralSteel));
p.part("support-right", b(310, 0, 80, 110, 600, 650).color(structuralSteel));
p.part("crusher-shell", c(0, 0, 170, 520, 285, 12).color(coatedSteel));
p.part("inner-cone", c(0, 0, 280, 410, 180, 10).color(coatedSteel));
p.part("top-bowl", c(0, 0, 670, 95, 340, 12).color(coatedSteel));
p.part("feed-box", b(0, 0, 760, 620, 580, 150).color(coatedSteel));
p.part("service-deck", b(0, 400, 570, 1050, 180, 45).color(structuralSteel));
p.part("drive-cabinet", b(-500, -280, 90, 180, 200, 360).color(coatedSteel));

return p.model();
