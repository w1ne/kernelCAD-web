// SPDX-License-Identifier: CC0-1.0
// Pump station control panel: Floor-mounted pump control panel with rain hood, paired access doors and status lamps. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "pump-station-control-panel",
  license: 'CC0-1.0',
  title: "Pump station control panel",
  description: "Floor-mounted pump control panel with rain hood, paired access doors and status lamps. Parameters: overall scale and coated equipment steel, structural steel, instrument glass; weathered and highVisibility presets.",
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
const instrumentGlass = param('instrumentGlass', '#5eb5c1', { label: 'Instrument glass' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', instrumentGlass: '#548b91' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', instrumentGlass: '#43b4c8' },
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

const p=assembly("pump-station-control-panel");
p.part("plinth",b(0,0,0,580,380,50).color(structuralSteel));
p.part("body",b(0,0,475,520,330,900).color(coatedSteel));
p.part("hood",b(0,0,945,620,410,60).color(coatedSteel));
p.part("door-left",b(-125,-170,85,220,22,700).color(coatedSteel));
p.part("door-right",b(125,-170,85,220,22,700).color(coatedSteel));
p.part("lamp-0",c(-120,-190,805,34,22,10).color(instrumentGlass));
p.part("lamp-1",c(0,-190,805,34,22,10).color(instrumentGlass));
p.part("lamp-2",c(120,-190,805,34,22,10).color(instrumentGlass));
p.part("handle",b(210,-195,435,35,24,170).color(coatedSteel));

return p.model();
