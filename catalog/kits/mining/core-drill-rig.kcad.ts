// SPDX-License-Identifier: CC0-1.0
// Exploration core drill rig: Portable exploration drill with anchor frame, mast, crown block, rod rack, and control cabinet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "core-drill-rig",
  license: 'CC0-1.0',
  title: "Exploration core drill rig",
  description: "Portable exploration drill with anchor frame, mast, crown block, rod rack, and control cabinet. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#85a865', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca' },
});
const baseZ=20;
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

const p=assembly("core-drill-rig");
p.part("base-frame", b(0, 0, 20, 780, 640, 80).color(structuralSteel));
p.part("left-upright", b(-260, 0, 100, 70, 90, 950).color(structuralSteel));
p.part("right-upright", b(260, 0, 100, 70, 90, 950).color(structuralSteel));
p.part("crosshead", b(0, 0, 930, 620, 130, 80).color(coatedSteel));
p.part("drill-spindle", c(0, 0, 230, 640, 115, 10).color(stainlessSteel));
p.part("control-cabinet", b(-420, 0, 100, 180, 280, 360).color(coatedSteel));
p.part("rod-rack", b(420, 0, 90, 150, 310, 580).color(stainlessSteel));
p.part("hydraulic-pack", c(0, -260, 100, 220, 105, 10).color(stainlessSteel));

return p.model();
