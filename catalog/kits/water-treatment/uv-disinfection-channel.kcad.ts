// SPDX-License-Identifier: CC0-1.0
// UV disinfection channel: Covered UV channel with support frame, lamp cassette bars and service bridge. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "uv-disinfection-channel",
  license: 'CC0-1.0',
  title: "UV disinfection channel",
  description: "Covered UV channel with support frame, lamp cassette bars and service bridge. Parameters: overall scale and concrete, structural steel, instrument glass; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const instrumentGlass = param('instrumentGlass', '#5eb5c1', { label: 'Instrument glass' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#6e6b63', instrumentGlass: '#548b91' },
  highVisibility: { concrete: '#c6bdac', structuralSteel: '#505b60', instrumentGlass: '#43b4c8' },
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

const p=assembly("uv-disinfection-channel");
p.part("channel-floor",b(0,0,0,1200,520,40).color(concrete));
p.part("wall-front",b(0,-230,20,1200,60,300).color(concrete));
p.part("wall-back",b(0,230,20,1200,60,300).color(concrete));
p.part("bridge",b(0,0,340,1200,580,55).color(structuralSteel));
p.part("lamp-0",c(-400,0,180,280,28,10).color(instrumentGlass));
p.part("lamp-1",c(-200,0,180,280,28,10).color(instrumentGlass));
p.part("lamp-2",c(0,0,180,280,28,10).color(instrumentGlass));
p.part("lamp-3",c(200,0,180,280,28,10).color(instrumentGlass));
p.part("lamp-4",c(400,0,180,280,28,10).color(instrumentGlass));
p.part("frame-post--520",b(-520,0,375,40,50,160).color(structuralSteel));
p.part("frame-post-520",b(520,0,375,40,50,160).color(structuralSteel));

return p.model();
