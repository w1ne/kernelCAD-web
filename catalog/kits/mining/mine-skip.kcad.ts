// SPDX-License-Identifier: CC0-1.0
// Mine skip conveyance: Compact ore skip with reinforced side walls, guide rails, a top bail, and a discharge gate. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-skip",
  license: 'CC0-1.0',
  title: "Mine skip conveyance",
  description: "Compact ore skip with reinforced side walls, guide rails, a top bail, and a discharge gate. Controls: overall scale, coated equipment steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89365', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', stainlessSteel: '#c5ccca' },
});
const baseZ=30;
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

const p=assembly("mine-skip");
p.part("floor", b(0, 0, 35, 520, 430, 65).color(coatedSteel));
p.part("side-left", b(-225, 0, 100, 60, 420, 530).color(coatedSteel));
p.part("side-right", b(225, 0, 100, 60, 420, 530).color(coatedSteel));
p.part("front-wall", b(0, -180, 100, 420, 55, 530).color(coatedSteel));
p.part("back-wall", b(0, 180, 100, 420, 55, 530).color(coatedSteel));
p.part("guide-left", b(-280, 0, 30, 35, 35, 690).color(coatedSteel));
p.part("guide-right", b(280, 0, 30, 35, 35, 690).color(coatedSteel));
p.part("lifting-pin", c(0, 0, 630, 65, 85, 10).color(stainlessSteel));
p.part("gate", b(0, -225, 70, 350, 35, 90).color(coatedSteel));

return p.model();
