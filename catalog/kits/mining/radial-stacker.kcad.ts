// SPDX-License-Identifier: CC0-1.0
// Radial stacker conveyor: Mobile radial stacker with long trussed boom, wheeled pivot base, feed hopper, and discharge hood. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "radial-stacker",
  license: 'CC0-1.0',
  title: "Radial stacker conveyor",
  description: "Mobile radial stacker with long trussed boom, wheeled pivot base, feed hopper, and discharge hood. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#b98434', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
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

const p=assembly("radial-stacker");
p.part("pivot-base", b(-500, 0, 0, 460, 560, 120).color(structuralSteel));
p.part("left-wheel", b(-520, -330, 0, 250, 90, 180).color(rubber));
p.part("right-wheel", b(-520, 330, 0, 250, 90, 180).color(rubber));
p.part("boom-belt", b(180, 0, 600, 1450, 270, 65).color(rubber));
p.part("boom-left-truss", b(180, -150, 500, 1450, 50, 70).color(structuralSteel));
p.part("boom-right-truss", b(180, 150, 500, 1450, 50, 70).color(structuralSteel));
p.part("support-leg", b(50, 0, 80, 80, 90, 490).color(structuralSteel));
p.part("feed-hopper", b(-460, 0, 360, 330, 400, 280).color(coatedSteel));
p.part("discharge-hood", b(920, 0, 590, 200, 360, 160).color(stainlessSteel));
p.part("pivot-bearing", c(-500, 0, 120, 120, 170, 10).color(stainlessSteel));

return p.model();
