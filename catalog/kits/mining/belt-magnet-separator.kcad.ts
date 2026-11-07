// SPDX-License-Identifier: CC0-1.0
// Overband belt magnet separator: Overband magnetic separator above a short ore belt with suspended magnet housing and support portal. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "belt-magnet-separator",
  license: 'CC0-1.0',
  title: "Overband belt magnet separator",
  description: "Overband magnetic separator above a short ore belt with suspended magnet housing and support portal. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#94a865', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
});
const baseZ=80;
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("belt-magnet-separator");
p.part("conveyor-belt", b(0, 0, 150, 1120, 480, 55).color(rubber));
p.part("left-stringer", b(0, -220, 90, 1120, 55, 100).color(structuralSteel));
p.part("right-stringer", b(0, 220, 90, 1120, 55, 100).color(structuralSteel));
p.part("portal-left", b(-100, -300, 235, 65, 65, 560).color(structuralSteel));
p.part("portal-right", b(-100, 300, 235, 65, 65, 560).color(structuralSteel));
p.part("portal-top", b(-100, 0, 780, 700, 70, 70).color(structuralSteel));
p.part("magnet-housing", b(-100, 0, 590, 360, 350, 150).color(coatedSteel));
p.part("coil-cap", c(-100, 0, 740, 60, 180, 10).color(coatedSteel));
p.part("control-box", b(420, -290, 110, 190, 150, 290).color(coatedSteel));
p.part("belt-drum", hy(520, 0, 150, 500, 70, 10).color(rubber));

return p.model();
