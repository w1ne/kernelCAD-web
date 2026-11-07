// SPDX-License-Identifier: CC0-1.0
// Flotation conditioning tank: Conditioning vessel with mixer gearbox, central shaft, paddle set, rim, and feed pipe. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "flotation-conditioning-tank",
  license: 'CC0-1.0',
  title: "Flotation conditioning tank",
  description: "Conditioning vessel with mixer gearbox, central shaft, paddle set, rim, and feed pipe. Controls: overall scale, coated equipment steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a88a', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', stainlessSteel: '#c5ccca' },
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

const p=assembly("flotation-conditioning-tank");
p.part("tank", c(0, 0, 0, 610, 330, 12).color(coatedSteel));
p.part("rim", c(0, 0, 600, 65, 355, 12).color(coatedSteel));
p.part("shaft", c(0, 0, 170, 620, 34, 8).color(stainlessSteel));
p.part("gearbox", b(0, 0, 820, 240, 220, 165).color(coatedSteel));
p.part("mixer-arm-left", b(-145, 0, 400, 360, 50, 45).color(coatedSteel));
p.part("mixer-arm-right", b(145, 0, 400, 360, 50, 45).color(coatedSteel));
p.part("paddle-left", b(-285, 0, 340, 70, 90, 210).color(stainlessSteel));
p.part("paddle-right", b(285, 0, 340, 70, 90, 210).color(stainlessSteel));
p.part("feed-nozzle", c(0, -370, 280, 130, 52, 8).color(coatedSteel));

return p.model();
