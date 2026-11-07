// SPDX-License-Identifier: CC0-1.0
// Mill feed chute: Wear-lined transfer chute with feed collar, sloped body panels, support saddle, and inspection hatch. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mill-feed-chute",
  license: 'CC0-1.0',
  title: "Mill feed chute",
  description: "Wear-lined transfer chute with feed collar, sloped body panels, support saddle, and inspection hatch. Controls: overall scale, coated equipment steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89965', { label: 'Coated equipment steel' });
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

const p=assembly("mill-feed-chute");
p.part("top-collar", b(0, 0, 620, 600, 580, 70).color(coatedSteel));
p.part("front-panel", b(0, -230, 340, 550, 60, 520).color(coatedSteel));
p.part("rear-panel", b(0, 230, 340, 550, 60, 520).color(coatedSteel));
p.part("left-panel", b(-245, 0, 340, 60, 400, 520).color(coatedSteel));
p.part("right-panel", b(245, 0, 340, 60, 400, 520).color(coatedSteel));
p.part("outlet-neck", b(0, 0, 75, 360, 340, 180).color(coatedSteel));
p.part("saddle-left", b(-330, 0, 0, 75, 520, 240).color(coatedSteel));
p.part("saddle-right", b(330, 0, 0, 75, 520, 240).color(coatedSteel));
p.part("inspection-hatch", b(0, -270, 420, 220, 30, 170).color(coatedSteel));
p.part("access-boss", c(0, -300, 500, 70, 68, 8).color(stainlessSteel));

return p.model();
