// SPDX-License-Identifier: CC0-1.0
// Rotary blasthole drill rig: Surface drill rig with crawler base, elevated deck, tall feed mast, drill string, and operator cabin. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "rotary-blasthole-drill",
  license: 'CC0-1.0',
  title: "Rotary blasthole drill rig",
  description: "Surface drill rig with crawler base, elevated deck, tall feed mast, drill string, and operator cabin. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#dfa33e', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
});
const baseZ=35;
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

const p=assembly("rotary-blasthole-drill");
p.part("left-crawler", b(-80, -300, 35, 1050, 175, 105).color(coatedSteel));
p.part("right-crawler", b(-80, 300, 35, 1050, 175, 105).color(coatedSteel));
p.part("main-deck", b(-50, 0, 150, 920, 580, 170).color(structuralSteel));
p.part("operator-cab", b(-330, 145, 320, 300, 260, 360).color(coatedSteel));
p.part("cab-roof", b(-330, 145, 680, 340, 300, 50).color(coatedSteel));
p.part("drill-mast", b(300, 0, 300, 185, 220, 1250).color(structuralSteel));
p.part("drill-string", c(300, 0, 60, 300, 50, 8).color(stainlessSteel));
p.part("hose-rack", b(40, -280, 325, 280, 80, 270).color(rubber));

return p.model();
