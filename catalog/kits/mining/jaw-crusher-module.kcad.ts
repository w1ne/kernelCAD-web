// SPDX-License-Identifier: CC0-1.0
// Jaw crusher module: Primary jaw crusher on a skid with feed throat, paired jaw blocks, flywheel housings, and drive motor. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "jaw-crusher-module",
  license: 'CC0-1.0',
  title: "Jaw crusher module",
  description: "Primary jaw crusher on a skid with feed throat, paired jaw blocks, flywheel housings, and drive motor. Controls: overall scale, coated equipment steel, structural steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a874', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a' },
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("jaw-crusher-module");
p.part("base-skid", b(0, 0, 0, 1100, 620, 90).color(structuralSteel));
p.part("frame-left", b(-370, 0, 90, 105, 500, 700).color(structuralSteel));
p.part("frame-right", b(370, 0, 90, 105, 500, 700).color(structuralSteel));
p.part("feed-wall-front", b(0, -250, 700, 790, 55, 260).color(coatedSteel));
p.part("feed-wall-back", b(0, 250, 700, 790, 55, 260).color(coatedSteel));
p.part("feed-wall-left", b(-365, 0, 700, 60, 445, 260).color(coatedSteel));
p.part("feed-wall-right", b(365, 0, 700, 60, 445, 260).color(coatedSteel));
p.part("fixed-jaw", b(-120, 0, 180, 100, 410, 450).color(coatedSteel));
p.part("swing-jaw", b(100, 0, 180, 95, 410, 400).color(coatedSteel));
p.part("flywheel-left", hy(-505, 0, 355, 105, 160, 10).color(rubber));
p.part("flywheel-right", hy(505, 0, 355, 105, 160, 10).color(rubber));
p.part("drive-motor", b(0, -400, 100, 360, 190, 190).color(coatedSteel));

return p.model();
