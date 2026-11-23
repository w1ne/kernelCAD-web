// SPDX-License-Identifier: CC0-1.0
// Pressure sand filter vessel: Vertical pressure vessel with domed-look end caps, inspection manway and side pipe nozzles. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "pressure-sand-filter-vessel",
  license: 'CC0-1.0',
  title: "Pressure sand filter vessel",
  description: "Vertical pressure vessel with faceted end heads, an inspection manway, and lower inlet / upper outlet pipe stubs that enter the shell through visible stainless flange lips. Parameters: overall scale and coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
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
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
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

// Annular pipe section, revolved around local Z. The radial transform below
// turns each stub into the vessel wall so the connection visibly enters the
// shell instead of floating beside it.
const annularPipe = (length:number, innerRadius:number, outerRadius:number) =>
  path().moveTo(innerRadius,0)
    .lineTo(outerRadius,0)
    .lineTo(outerRadius,length)
    .lineTo(innerRadius,length)
    .close()
    .revolve();
const radialFront = (shape, y:number, z:number) => shape.rotateX(90).translate(0,y,z).scale(scale);

const p=assembly("pressure-sand-filter-vessel");
p.part("shell",c(0,0,60,950,310,12).color(coatedSteel));
p.part("top-head",c(0,0,1010,90,285,12).color(coatedSteel));
p.part("bottom-head",c(0,0,0,80,285,12).color(coatedSteel));
p.part("manway",b(0,-305,570,190,45,190).color(coatedSteel));
// Both connections face the accessible side of the vessel. The inlet is low,
// the outlet clears the manway above, and each nozzle overlaps the shell wall.
for (const [name,z] of [["inlet",260], ["outlet",830]] as const) {
  p.part(`${name}-nozzle`,radialFront(annularPipe(130,32,48),-240,z).color(stainlessSteel));
  p.part(`${name}-flange`,radialFront(annularPipe(20,32,68),-350,z).color(stainlessSteel));
}
p.part("foot--190",b(-190,0,0,100,130,70).color(structuralSteel));
p.part("foot-190",b(190,0,0,100,130,70).color(structuralSteel));

return p.model();
