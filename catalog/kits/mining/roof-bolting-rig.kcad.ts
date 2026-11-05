// SPDX-License-Identifier: CC0-1.0
// Underground roof-bolting rig: Compact bolting vehicle with protected cab, tracked base, feed mast, and paired drill heads. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "roof-bolting-rig",
  license: 'CC0-1.0',
  title: "Underground roof-bolting rig",
  description: "Compact bolting vehicle with protected cab, tracked base, feed mast, and paired drill heads. Controls: overall scale, coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#dea83e', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159' },
});
const baseZ=35;
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

const p=assembly("roof-bolting-rig");
p.part("left-track", b(-80, -230, 35, 760, 135, 90).color(structuralSteel));
p.part("right-track", b(-80, 230, 35, 760, 135, 90).color(structuralSteel));
p.part("chassis", b(-60, 0, 120, 780, 390, 170).color(structuralSteel));
p.part("cab", b(-300, 0, 290, 300, 330, 300).color(coatedSteel));
p.part("cab-roof", b(-300, 0, 590, 340, 370, 50).color(coatedSteel));
p.part("feed-mast", b(300, 0, 285, 130, 150, 510).color(structuralSteel));
p.part("drill-head-left", c(280, -125, 690, 125, 48, 8).color(coatedSteel));
p.part("drill-head-right", c(280, 125, 690, 125, 48, 8).color(coatedSteel));

return p.model();
