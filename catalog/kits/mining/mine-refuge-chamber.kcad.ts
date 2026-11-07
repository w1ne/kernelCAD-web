// SPDX-License-Identifier: CC0-1.0
// Mine refuge chamber: Underground refuge pod with reinforced shell, access door, roof rails, and external air bottles. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-refuge-chamber",
  license: 'CC0-1.0',
  title: "Mine refuge chamber",
  description: "Underground refuge pod with reinforced shell, access door, roof rails, and external air bottles. Controls: overall scale, coated equipment steel, structural steel, instrument glass; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#70a865', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const instrumentGlass = param('instrumentGlass', '#5c929c', { label: 'Instrument glass' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', instrumentGlass: '#55787d' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', instrumentGlass: '#5fb6c1' },
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

const p=assembly("mine-refuge-chamber");
p.part("floor-skid", b(0, 0, 0, 1050, 610, 70).color(structuralSteel));
p.part("pod-body", b(0, 0, 70, 980, 540, 520).color(coatedSteel));
p.part("roof-cap", b(0, 0, 590, 1020, 580, 80).color(coatedSteel));
p.part("entry-door", b(0, -285, 125, 310, 35, 400).color(coatedSteel));
p.part("window-panel", b(290, -286, 340, 180, 28, 115).color(instrumentGlass));
p.part("air-bottle-left", c(-360, 360, 80, 530, 82, 10).color(coatedSteel));
p.part("air-bottle-right", c(-130, 360, 80, 530, 82, 10).color(coatedSteel));
p.part("roof-rail", b(0, 300, 680, 960, 35, 40).color(structuralSteel));

return p.model();
