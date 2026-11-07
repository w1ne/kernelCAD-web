// SPDX-License-Identifier: CC0-1.0
// Vacuum disc filter: Dewatering unit with trough, central shaft, filter-disc panels, support bearings, and vacuum header. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "vacuum-disc-filter",
  license: 'CC0-1.0',
  title: "Vacuum disc filter",
  description: "Dewatering unit with trough, central shaft, filter-disc panels, support bearings, and vacuum header. Controls: overall scale, coated equipment steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a884', { label: 'Coated equipment steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', stainlessSteel: '#c5ccca' },
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

const p=assembly("vacuum-disc-filter");
p.part("trough", b(0, 0, 0, 1180, 600, 220).color(coatedSteel));
p.part("left-bearing", b(-430, 0, 220, 145, 670, 320).color(stainlessSteel));
p.part("right-bearing", b(430, 0, 220, 145, 670, 320).color(stainlessSteel));
p.part("filter-shaft", c(0, 0, 380, 100, 65, 10).color(stainlessSteel));
p.part("filter-disc-0", b(-330, 0, 430, 60, 440, 390).color(stainlessSteel));
p.part("filter-disc-1", b(-165, 0, 430, 60, 440, 390).color(stainlessSteel));
p.part("filter-disc-2", b(0, 0, 430, 60, 440, 390).color(stainlessSteel));
p.part("filter-disc-3", b(165, 0, 430, 60, 440, 390).color(stainlessSteel));
p.part("filter-disc-4", b(330, 0, 430, 60, 440, 390).color(stainlessSteel));
p.part("vacuum-header", b(0, -365, 330, 950, 55, 55).color(coatedSteel));
p.part("drive-motor", b(600, 0, 235, 220, 230, 230).color(coatedSteel));
p.part("vacuum-receiver", c(0, 390, 100, 350, 120, 10).color(coatedSteel));

return p.model();
