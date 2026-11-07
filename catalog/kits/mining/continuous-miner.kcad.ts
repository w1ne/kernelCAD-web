// SPDX-License-Identifier: CC0-1.0
// Continuous miner: Low tracked mining machine with cutting head, operator canopy, cutter drum, and trailing cable reel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "continuous-miner",
  license: 'CC0-1.0',
  title: "Continuous miner",
  description: "Low tracked mining machine with cutting head, operator canopy, cutter drum, and trailing cable reel. Controls: overall scale, coated equipment steel, structural steel, stainless steel, rubber; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#cb9f39', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', stainlessSteel: '#969f9e', rubber: '#393a38' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', stainlessSteel: '#c5ccca', rubber: '#24282a' },
});
const baseZ=35;
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
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>loftCylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);
const hy=(x:number,y:number,z:number,l:number,r:number,n=10)=>loftCylinder(l,r,n).alongAxis([0,1,0]).translate(x,y-l/2,z-baseZ).scale(scale);

const p=assembly("continuous-miner");
p.part("left-track", b(-90, -245, 35, 950, 145, 95).color(structuralSteel));
p.part("right-track", b(-90, 245, 35, 950, 145, 95).color(structuralSteel));
p.part("main-body", b(-90, 0, 130, 700, 360, 190).color(coatedSteel));
p.part("operator-canopy", b(175, 0, 330, 360, 360, 55).color(coatedSteel));
p.part("cutting-drum", hy(440, 0, 225, 350, 155, 12).color(stainlessSteel));
p.part("cutter-boom", b(330, 0, 190, 330, 160, 110).color(coatedSteel));
p.part("cable-reel", c(-450, 0, 180, 100, 125, 10).color(rubber));
p.part("rear-control-box", b(-460, 0, 165, 160, 280, 210).color(coatedSteel));

for (let shoe = 0; shoe < 10; shoe++) {
  const x = -500 + shoe * 90;
  p.part(`left-track-shoe-${shoe + 1}`, b(x,-320,35,72,16,72).color(stainlessSteel));
  p.part(`right-track-shoe-${shoe + 1}`, b(x,320,35,72,16,72).color(stainlessSteel));
}
for (let pick = 0; pick < 10; pick++) {
  const angle = (2 * Math.PI * pick) / 10;
  const x = 440 + 170 * Math.cos(angle);
  const z = 225 + 170 * Math.sin(angle);
  p.part(`cutting-pick-${pick + 1}`, box(42,44,32,true).rotateY((360 * pick) / 10).translate(x,0,z-baseZ).scale(scale).color(stainlessSteel));
}

return p.model();
