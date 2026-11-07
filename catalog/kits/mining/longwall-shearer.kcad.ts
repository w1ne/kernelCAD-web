// SPDX-License-Identifier: CC0-1.0
// Longwall shearer: Armored face shearer with twin cutter drums, central drive housing, and low guide shoes. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "longwall-shearer",
  license: 'CC0-1.0',
  title: "Longwall shearer",
  description: "Armored face shearer with twin cutter drums, central drive housing, and low guide shoes. Controls: overall scale, coated equipment steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a8a365', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', stainlessSteel: '#c5ccca', rubber: '#24282a' },
});
const baseZ=45;
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

const p=assembly("longwall-shearer");
p.part("shearer-body", b(0, 0, 120, 820, 310, 175).color(coatedSteel));
p.part("guide-shoe-left", b(-40, -250, 45, 940, 70, 80).color(stainlessSteel));
p.part("guide-shoe-right", b(-40, 250, 45, 940, 70, 80).color(stainlessSteel));
p.part("cutter-left", c(395, -235, 150, 160, 145, 10).color(coatedSteel));
p.part("cutter-right", c(395, 235, 150, 160, 145, 10).color(coatedSteel));
p.part("gearbox-left", b(-330, -170, 145, 180, 150, 160).color(coatedSteel));
p.part("gearbox-right", b(-330, 170, 145, 180, 150, 160).color(coatedSteel));
p.part("cable-arm", b(-440, 0, 265, 170, 75, 60).color(rubber));

return p.model();
