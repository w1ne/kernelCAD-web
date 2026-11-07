// SPDX-License-Identifier: CC0-1.0
// Slurry pump skid: Heavy-duty slurry pump with motor, guarded coupling, suction elbow, discharge riser, and base rails. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "slurry-pump-skid",
  license: 'CC0-1.0',
  title: "Slurry pump skid",
  description: "Heavy-duty slurry pump with motor, guarded coupling, suction elbow, discharge riser, and base rails. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a898', { label: 'Coated equipment steel' });
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

const p=assembly("slurry-pump-skid");
p.part("base-skid", b(0, 0, 0, 1250, 600, 70).color(structuralSteel));
p.part("motor", b(-300, 0, 90, 390, 340, 280).color(coatedSteel));
p.part("coupling-guard", b(60, 0, 120, 170, 210, 130).color(structuralSteel));
p.part("pump-casing", c(260, 0, 90, 320, 210, 12).color(coatedSteel));
p.part("suction-flange", c(260, -250, 180, 90, 165, 12).color(coatedSteel));
p.part("discharge-riser", b(260, 205, 400, 125, 125, 290).color(stainlessSteel));
p.part("discharge-flange", b(260, 205, 670, 210, 210, 55).color(stainlessSteel));
p.part("motor-foot-left", b(-390, -230, 65, 140, 80, 55).color(structuralSteel));
p.part("motor-foot-right", b(-390, 230, 65, 140, 80, 55).color(structuralSteel));

return p.model();
