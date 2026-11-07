// SPDX-License-Identifier: CC0-1.0
// High-pressure grinding rolls: Roll press with paired compression rolls, rigid side frames, feed hopper, and hydraulic drive blocks. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "high-pressure-grinding-rolls",
  license: 'CC0-1.0',
  title: "High-pressure grinding rolls",
  description: "Roll press with paired compression rolls, rigid side frames, feed hopper, and hydraulic drive blocks. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#65a889', { label: 'Coated equipment steel' });
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
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("high-pressure-grinding-rolls");
p.part("base-frame", b(0, 0, 0, 1060, 760, 90).color(structuralSteel));
p.part("left-frame", b(-390, 0, 90, 120, 620, 750).color(structuralSteel));
p.part("right-frame", b(390, 0, 90, 120, 620, 750).color(structuralSteel));
p.part("roll-left", hy(-150, 0, 465, 590, 215, 12).color(stainlessSteel));
p.part("roll-right", hy(150, 0, 465, 590, 215, 12).color(stainlessSteel));
p.part("feed-hopper", b(0, 0, 760, 650, 570, 180).color(coatedSteel));
p.part("hydraulic-left", b(0, -360, 630, 190, 110, 110).color(stainlessSteel));
p.part("hydraulic-right", b(0, 360, 630, 190, 110, 110).color(stainlessSteel));
p.part("drive-left", b(-550, 0, 120, 170, 400, 320).color(coatedSteel));
p.part("drive-right", b(550, 0, 120, 170, 400, 320).color(coatedSteel));

return p.model();
