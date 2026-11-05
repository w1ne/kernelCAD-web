// SPDX-License-Identifier: CC0-1.0
// Stacker reclaimer boom: Yard boom assembly with turntable, trussed conveyor, support portal, and bucket-wheel end housing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "stacker-reclaimer-boom",
  license: 'CC0-1.0',
  title: "Stacker reclaimer boom",
  description: "Yard boom assembly with turntable, trussed conveyor, support portal, and bucket-wheel end housing. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a88e5c', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
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

const p=assembly("stacker-reclaimer-boom");
p.part("foundation", b(0, 0, 0, 700, 620, 90).color(structuralSteel));
p.part("turntable", c(0, 0, 90, 170, 290, 12).color(coatedSteel));
p.part("portal-left", b(-180, 0, 260, 90, 90, 610).color(structuralSteel));
p.part("portal-right", b(180, 0, 260, 90, 90, 610).color(structuralSteel));
p.part("portal-top", b(0, 0, 850, 500, 110, 85).color(structuralSteel));
p.part("boom-belt", b(450, 0, 770, 1100, 220, 65).color(rubber));
p.part("boom-truss", b(450, 0, 600, 1050, 60, 220).color(structuralSteel));
p.part("bucket-wheel", c(1000, 0, 530, 250, 240, 12).color(coatedSteel));
p.part("counterweight", b(-500, 0, 200, 300, 440, 360).color(coatedSteel));
p.part("operator-cab", b(0, -300, 650, 250, 180, 260).color(coatedSteel));

return p.model();
