// SPDX-License-Identifier: CC0-1.0
// Tailings thickener bridge: Circular thickener tank with peripheral rim, radial bridge, central drive, and rake-arm crossbar. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "thickener-bridge",
  license: 'CC0-1.0',
  title: "Tailings thickener bridge",
  description: "Circular thickener tank with peripheral rim, radial bridge, central drive, and rake-arm crossbar. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a88b', { label: 'Coated equipment steel' });
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

const p=assembly("thickener-bridge");
p.part("tank", c(0, 0, 0, 170, 620, 16).color(coatedSteel));
p.part("tank-rim", c(0, 0, 150, 60, 650, 16).color(coatedSteel));
p.part("bridge", b(0, 0, 210, 1200, 70, 65).color(structuralSteel));
p.part("bridge-rail-left", b(0, -85, 275, 1100, 25, 55).color(structuralSteel));
p.part("bridge-rail-right", b(0, 85, 275, 1100, 25, 55).color(structuralSteel));
p.part("center-drive", c(0, 0, 210, 200, 155, 12).color(coatedSteel));
p.part("drive-cover", b(0, 0, 410, 260, 220, 130).color(coatedSteel));
p.part("rake-arm-left", b(-220, 0, 80, 450, 35, 35).color(coatedSteel));
p.part("rake-arm-right", b(220, 0, 80, 450, 35, 35).color(coatedSteel));
p.part("walkway", b(0, -560, 210, 300, 120, 45).color(structuralSteel));

return p.model();
