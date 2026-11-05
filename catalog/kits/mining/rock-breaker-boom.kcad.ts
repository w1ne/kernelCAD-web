// SPDX-License-Identifier: CC0-1.0
// Crusher rock-breaker boom: Pedestal-mounted breaker boom with segmented arm, hydraulic cylinders, and hammer tool. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "rock-breaker-boom",
  license: 'CC0-1.0',
  title: "Crusher rock-breaker boom",
  description: "Pedestal-mounted breaker boom with segmented arm, hydraulic cylinders, and hammer tool. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#ba8934', { label: 'Coated equipment steel' });
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

const p=assembly("rock-breaker-boom");
p.part("base-plinth", b(0, 0, 0, 500, 470, 90).color(structuralSteel));
p.part("turntable", c(0, 0, 90, 130, 220, 10).color(coatedSteel));
p.part("pedestal", b(0, 0, 220, 240, 240, 300).color(coatedSteel));
p.part("boom-lower", b(190, 0, 430, 500, 150, 135).color(coatedSteel));
p.part("boom-upper", b(480, 0, 560, 470, 125, 115).color(coatedSteel));
p.part("hydraulic-cylinder", b(280, -115, 470, 330, 50, 65).color(stainlessSteel));
p.part("hammer-body", b(760, 0, 470, 140, 135, 320).color(coatedSteel));
p.part("tool-tip", c(760, 0, 405, 90, 58, 8).color(stainlessSteel));
p.part("hose-pack", b(280, 110, 360, 330, 45, 45).color(rubber));

return p.model();
