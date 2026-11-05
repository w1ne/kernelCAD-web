// SPDX-License-Identifier: CC0-1.0
// Submersible lift station pump: Vertical submersible pump with lifting handle, motor body, screened intake and cable tail. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "submersible-lift-station-pump",
  license: 'CC0-1.0',
  title: "Submersible lift station pump",
  description: "Vertical submersible pump with lifting handle, motor body, screened intake and cable tail. Parameters: overall scale and coated equipment steel, structural steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
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
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("submersible-lift-station-pump");
p.part("motor-body",c(0,0,60,430,145,12).color(coatedSteel));
p.part("pump-head",c(0,0,490,90,115,10).color(coatedSteel));
p.part("intake-base",c(0,0,0,60,185,12).color(structuralSteel));
p.part("intake-slot-0",b(-80,-155,15,16,25,85).color(coatedSteel));
p.part("intake-slot-1",b(-48,-155,15,16,25,85).color(coatedSteel));
p.part("intake-slot-2",b(-16,-155,15,16,25,85).color(coatedSteel));
p.part("intake-slot-3",b(16,-155,15,16,25,85).color(coatedSteel));
p.part("intake-slot-4",b(48,-155,15,16,25,85).color(coatedSteel));
p.part("intake-slot-5",b(80,-155,15,16,25,85).color(coatedSteel));
p.part("handle-left",b(-75,0,520,32,35,140).color(coatedSteel));
p.part("handle-right",b(75,0,520,32,35,140).color(coatedSteel));
p.part("cable",b(100,0,540,28,28,300).color(coatedSteel));

return p.model();
