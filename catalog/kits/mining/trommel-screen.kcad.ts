// SPDX-License-Identifier: CC0-1.0
// Rotary trommel screen: Trommel screening unit with perforated-look drum, support frame, feed box, and drive enclosure. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "trommel-screen",
  license: 'CC0-1.0',
  title: "Rotary trommel screen",
  description: "Trommel screening unit with perforated-look drum, support frame, feed box, and drive enclosure. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89a65', { label: 'Coated equipment steel' });
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
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("trommel-screen");
p.part("base-skid", b(0, 0, 0, 1160, 700, 65).color(structuralSteel));
p.part("support-left", b(-360, 0, 65, 100, 620, 440).color(structuralSteel));
p.part("support-right", b(360, 0, 65, 100, 620, 440).color(structuralSteel));
p.part("drum-front-ring", c(-280, 0, 300, 110, 310, 12).color(stainlessSteel));
p.part("drum-body", c(0, 0, 300, 560, 260, 12).color(stainlessSteel));
p.part("drum-rear-ring", c(280, 0, 300, 110, 310, 12).color(stainlessSteel));
p.part("feed-box", b(-560, 0, 260, 260, 520, 300).color(coatedSteel));
p.part("drive-guard", b(80, -390, 160, 330, 200, 240).color(structuralSteel));
p.part("oversize-chute", b(520, 0, 120, 240, 520, 230).color(coatedSteel));

return p.model();
