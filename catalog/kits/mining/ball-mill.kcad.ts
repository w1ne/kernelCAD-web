// SPDX-License-Identifier: CC0-1.0
// Ball mill assembly: Mill assembly with compact drum shell, trunnion ends, bearing saddles, motor bed, and feed chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ball-mill",
  license: 'CC0-1.0',
  title: "Ball mill assembly",
  description: "Mill assembly with compact drum shell, trunnion ends, bearing saddles, motor bed, and feed chute. Controls: overall scale, coated equipment steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a87b', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', stainlessSteel: '#c5ccca' },
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
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("ball-mill");
p.part("shell", hx(0, 0, 455, 920, 225, 12).color(coatedSteel));
p.part("feed-trunnion", hx(-510, 0, 455, 220, 115, 10).color(stainlessSteel));
p.part("discharge-trunnion", hx(510, 0, 455, 220, 115, 10).color(stainlessSteel));
p.part("bearing-left", b(-360, 0, 90, 180, 650, 190).color(stainlessSteel));
p.part("bearing-right", b(360, 0, 90, 180, 650, 190).color(stainlessSteel));
p.part("girth-ring", hx(120, 0, 455, 90, 280, 12).color(stainlessSteel));
p.part("motor", b(0, -440, 90, 330, 230, 250).color(coatedSteel));
p.part("feed-chute", b(-680, 0, 250, 230, 290, 180).color(coatedSteel));
p.part("discharge-box", b(680, 0, 80, 220, 620, 180).color(stainlessSteel));

return p.model();
