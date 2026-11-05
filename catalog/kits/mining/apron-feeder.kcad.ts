// SPDX-License-Identifier: CC0-1.0
// Heavy-duty apron feeder: Low feeder with overlapping pan plates, side chains, head sprocket housings, and a feed skirt. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "apron-feeder",
  license: 'CC0-1.0',
  title: "Heavy-duty apron feeder",
  description: "Low feeder with overlapping pan plates, side chains, head sprocket housings, and a feed skirt. Controls: overall scale, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#a89160', { label: 'Coated equipment steel' });
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

const p=assembly("apron-feeder");
p.part("left-rail", b(0, -310, 0, 1320, 75, 220).color(structuralSteel));
p.part("right-rail", b(0, 310, 0, 1320, 75, 220).color(structuralSteel));
p.part("apron-pan-0", b(-500, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-1", b(-375, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-2", b(-250, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-3", b(-125, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-4", b(0, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-5", b(125, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-6", b(250, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-7", b(375, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("apron-pan-8", b(500, 0, 115, 118, 555, 45).color(coatedSteel));
p.part("head-sprocket-left", hy(570, -310, 150, 115, 125, 8).color(stainlessSteel));
p.part("head-sprocket-right", hy(570, 310, 150, 115, 125, 8).color(stainlessSteel));
p.part("feed-skirt-left", b(-350, -360, 260, 500, 45, 360).color(coatedSteel));
p.part("feed-skirt-right", b(-350, 360, 260, 500, 45, 360).color(coatedSteel));
p.part("drive-motor", b(650, 0, 95, 250, 230, 180).color(coatedSteel));

return p.model();
