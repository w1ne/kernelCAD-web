// SPDX-License-Identifier: CC0-1.0
// Rapid sand filter bed: Open rectangular rapid filter with raised walls, underdrain header and removable cover beams. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "rapid-sand-filter",
  license: 'CC0-1.0',
  title: "Rapid sand filter bed",
  description: "Open rectangular rapid filter with raised walls, underdrain header and removable cover beams. Parameters: overall scale and concrete, structural steel, stainless steel, filter media; weathered and highVisibility presets.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const filterMedia = param('filterMedia', '#96744d', { label: 'Filter media' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', filterMedia: '#866f52' },
  highVisibility: { concrete: '#c6bdac', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', filterMedia: '#a07d4f' },
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

const p=assembly("rapid-sand-filter");
p.part("bed",b(0,0,0,1000,760,40).color(concrete));
p.part("wall-front",b(0,-350,20,1000,60,360).color(concrete));
p.part("wall-back",b(0,350,20,1000,60,360).color(concrete));
p.part("wall-left",b(-470,0,20,60,700,360).color(concrete));
p.part("wall-right",b(470,0,20,60,700,360).color(concrete));
p.part("media-layer",b(0,0,60,850,620,110).color(filterMedia));
p.part("underdrain",c(0,0,0,320,65,10).color(stainlessSteel));
p.part("cover-beam",b(0,0,385,950,55,40).color(structuralSteel));

return p.model();
