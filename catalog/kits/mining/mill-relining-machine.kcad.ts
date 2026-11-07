// SPDX-License-Identifier: CC0-1.0
// Mill relining machine: Service platform and hydraulic liner handler with low chassis, lift mast, boom, and guarded operator station. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mill-relining-machine",
  license: 'CC0-1.0',
  title: "Mill relining machine",
  description: "Service platform and hydraulic liner handler with low chassis, lift mast, boom, and guarded operator station. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#bb8a34', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
});
const baseZ=20;
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

const p=assembly("mill-relining-machine");
p.part("chassis", b(0, 0, 40, 920, 560, 120).color(structuralSteel));
p.part("left-wheel", b(-280, -320, 20, 230, 90, 170).color(rubber));
p.part("right-wheel", b(-280, 320, 20, 230, 90, 170).color(rubber));
p.part("operator-cab", b(-300, 0, 160, 260, 330, 290).color(coatedSteel));
p.part("cab-roof", b(-300, 0, 450, 300, 370, 45).color(coatedSteel));
p.part("lift-mast", b(220, 0, 155, 180, 190, 620).color(structuralSteel));
p.part("handler-boom", b(510, 0, 650, 440, 160, 120).color(coatedSteel));
p.part("tool-head", c(750, 0, 590, 150, 105, 10).color(coatedSteel));
p.part("counterweight", b(-470, 0, 80, 220, 420, 180).color(coatedSteel));

return p.model();
