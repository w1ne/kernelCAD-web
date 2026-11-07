// SPDX-License-Identifier: CC0-1.0
// Crusher discharge conveyor: Short transfer conveyor with guarded belt, support frames, head and tail drums, and a drive unit. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "crusher-discharge-conveyor",
  license: 'CC0-1.0',
  title: "Crusher discharge conveyor",
  description: "Short transfer conveyor with guarded belt, support frames, head and tail drums, and a drive unit. Controls: overall scale, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
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

const p=assembly("crusher-discharge-conveyor");
p.part("belt", b(0, 0, 180, 1450, 430, 60).color(rubber));
p.part("left-stringer", b(0, -190, 80, 1450, 55, 100).color(structuralSteel));
p.part("right-stringer", b(0, 190, 80, 1450, 55, 100).color(structuralSteel));
p.part("leg-left", b(-440, -190, 0, 75, 75, 240).color(structuralSteel));
p.part("leg-right", b(-440, 190, 0, 75, 75, 240).color(structuralSteel));
p.part("head-leg-left", b(440, -190, 0, 75, 75, 360).color(structuralSteel));
p.part("head-leg-right", b(440, 190, 0, 75, 75, 360).color(structuralSteel));
p.part("tail-drum", hy(-730, 0, 180, 430, 70, 12).color(stainlessSteel));
p.part("head-drum", hy(730, 0, 270, 430, 70, 12).color(stainlessSteel));
p.part("drive-guard", b(600, 280, 230, 250, 190, 230).color(structuralSteel));

return p.model();
