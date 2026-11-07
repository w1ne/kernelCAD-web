// SPDX-License-Identifier: CC0-1.0
// Conveyor metal detector arch: Inspection conveyor with detector arch, belt guides, control cabinet, and adjustable sensor head. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "metal-detector-arch",
  license: 'CC0-1.0',
  title: "Conveyor metal detector arch",
  description: "Inspection conveyor with detector arch, belt guides, control cabinet, and adjustable sensor head. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a872', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
});
const baseZ=70;
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("metal-detector-arch");
p.part("belt", b(0, 0, 120, 1020, 410, 60).color(rubber));
p.part("left-leg", b(0, -270, 180, 70, 70, 520).color(structuralSteel));
p.part("right-leg", b(0, 270, 180, 70, 70, 520).color(structuralSteel));
p.part("arch-top", b(0, 0, 700, 670, 80, 75).color(coatedSteel));
p.part("sensor-left", b(0, -300, 450, 80, 70, 470).color(coatedSteel));
p.part("sensor-right", b(0, 300, 450, 80, 70, 470).color(coatedSteel));
p.part("control-cabinet", b(-420, -300, 130, 190, 150, 320).color(coatedSteel));
p.part("signal-head", b(0, 0, 775, 120, 110, 100).color(coatedSteel));
p.part("tail-roller", hy(-500, 0, 130, 420, 60, 10).color(stainlessSteel));
p.part("head-roller", hy(500, 0, 130, 420, 60, 10).color(stainlessSteel));

return p.model();
