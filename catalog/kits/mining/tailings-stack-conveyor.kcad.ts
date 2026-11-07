// SPDX-License-Identifier: CC0-1.0
// Tailings stack conveyor: Long tailings conveyor with trussed support, raised discharge end, belt, and transfer hood. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "tailings-stack-conveyor",
  license: 'CC0-1.0',
  title: "Tailings stack conveyor",
  description: "Long tailings conveyor with trussed support, raised discharge end, belt, and transfer hood. Controls: overall scale, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
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

const p=assembly("tailings-stack-conveyor");
p.part("belt", b(0, 0, 480, 1700, 300, 65).color(rubber));
p.part("left-stringer", b(0, -165, 410, 1680, 55, 80).color(structuralSteel));
p.part("right-stringer", b(0, 165, 410, 1680, 55, 80).color(structuralSteel));
p.part("support-left", b(-500, -165, 0, 90, 90, 410).color(structuralSteel));
p.part("support-right", b(-500, 165, 0, 90, 90, 410).color(structuralSteel));
p.part("head-support-left", b(500, -165, 0, 90, 90, 650).color(structuralSteel));
p.part("head-support-right", b(500, 165, 0, 90, 90, 650).color(structuralSteel));
p.part("truss-web", b(0, 0, 220, 1300, 55, 220).color(structuralSteel));
p.part("discharge-hood", b(780, 0, 460, 220, 410, 200).color(stainlessSteel));
p.part("head-drum", hy(820, 0, 465, 420, 60, 10).color(stainlessSteel));

return p.model();
