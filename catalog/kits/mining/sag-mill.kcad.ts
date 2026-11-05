// SPDX-License-Identifier: CC0-1.0
// SAG grinding mill: Large grinding-mill shell on support piers with trunnion housings, girth drive ring, and feed end. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "sag-mill",
  license: 'CC0-1.0',
  title: "SAG grinding mill",
  description: "Large grinding-mill shell on support piers with trunnion housings, girth drive ring, and feed end. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#8fa865', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca' },
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
const hx=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([1,0,0]).translate(x-l/2,y,z-baseZ).scale(scale);

const p=assembly("sag-mill");
p.part("shell", hx(0, 0, 520, 1120, 260, 12).color(coatedSteel));
p.part("feed-trunnion", hx(-610, 0, 520, 240, 135, 12).color(stainlessSteel));
p.part("discharge-trunnion", hx(610, 0, 520, 240, 135, 12).color(stainlessSteel));
p.part("pier-left", b(-370, 0, 0, 180, 660, 280).color(structuralSteel));
p.part("pier-right", b(370, 0, 0, 180, 660, 280).color(structuralSteel));
p.part("girth-drive", hx(170, 0, 520, 100, 315, 12).color(coatedSteel));
p.part("motor-left", b(0, -450, 90, 320, 240, 260).color(coatedSteel));
p.part("feed-chute", b(-760, 0, 390, 260, 300, 220).color(coatedSteel));
p.part("discharge-launder", b(760, 0, 190, 250, 680, 150).color(stainlessSteel));

return p.model();
