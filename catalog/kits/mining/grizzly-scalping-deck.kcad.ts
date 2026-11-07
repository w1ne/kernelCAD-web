// SPDX-License-Identifier: CC0-1.0
// Grizzly scalping deck: Scalping screen with replaceable parallel bars, reinforced side rails, and shaker drive blocks. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "grizzly-scalping-deck",
  license: 'CC0-1.0',
  title: "Grizzly scalping deck",
  description: "Scalping screen with replaceable parallel bars, reinforced side rails, and shaker drive blocks. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#83a865', { label: 'Coated equipment steel' });
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

const p=assembly("grizzly-scalping-deck");
p.part("lower-frame", b(0, 0, 0, 1220, 780, 75).color(structuralSteel));
p.part("side-left", b(0, -360, 70, 1220, 75, 140).color(coatedSteel));
p.part("side-right", b(0, 360, 70, 1220, 75, 140).color(coatedSteel));
p.part("bar-0", b(-500, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-1", b(-375, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-2", b(-250, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-3", b(-125, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-4", b(0, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-5", b(125, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-6", b(250, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-7", b(375, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("bar-8", b(500, 0, 180, 55, 620, 340).color(stainlessSteel));
p.part("crossbeam-front", b(-550, 0, 100, 80, 760, 95).color(structuralSteel));
p.part("crossbeam-back", b(550, 0, 100, 80, 760, 95).color(structuralSteel));
p.part("vibrator-left", c(-430, 0, 340, 100, 80, 8).color(coatedSteel));
p.part("vibrator-right", c(430, 0, 340, 100, 80, 8).color(coatedSteel));

return p.model();
