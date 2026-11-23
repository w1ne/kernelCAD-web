// SPDX-License-Identifier: CC0-1.0
// Ferric coagulant day tank: a small polyethylene day tank on a polyethylene bund base. Ferric chloride corrodes
// carbon and stainless steel, so the tank, bund and pipework are plastic. A sight tube on the shell shows the
// rust-brown coagulant level; a PVC vent leaves the lid and a PVC dosing outlet leaves the shell above the bund floor.
// Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ferric-dosing-tank",
  license: 'CC0-1.0',
  title: "Ferric coagulant day tank",
  description: "Small polyethylene chemical day tank with bund base, level sight tube, PVC vent and PVC dosing outlet. Parameters: overall scale and tank polyethylene, bund polyethylene, PVC pipework, level sight tube; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const tankPolymer = param('tankPolymer', '#e6dfc4', { label: 'Tank polyethylene' });
const bundPolymer = param('bundPolymer', '#5f7f95', { label: 'Bund polyethylene' });
const pipePvc = param('pipePvc', '#8b9499', { label: 'PVC pipework' });
const sightTube = param('sightTube', '#9a5a2a', { label: 'Level sight tube' });
presets({
  weathered: { tankPolymer: '#c9c2a4', bundPolymer: '#5d6b74', pipePvc: '#7b8386', sightTube: '#7d4a26' },
  highVisibility: { tankPolymer: '#f2ead0', bundPolymer: '#e2b423', pipePvc: '#a7b0b4', sightTube: '#b8621f' },
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

const p=assembly("ferric-dosing-tank");
p.part("bund",b(0,0,0,650,520,50).color(bundPolymer));
p.part("tank",c(0,0,50,560,210,12).color(tankPolymer));
p.part("lid",c(0,0,610,55,220,12).color(tankPolymer));
p.part("vent",c(0,0,665,180,32,10).color(pipePvc));
// The sight tube sits on the -Y corner of the twelve-sided shell; the outlet stub runs along -X to the bund edge.
p.part("level-column",b(0,-225,125,45,35,360).color(sightTube));
p.part("outlet",loftCylinder(130,28,10).rotateY(-90).translate(-195,0,130).scale(scale).color(pipePvc));

return p.model();
