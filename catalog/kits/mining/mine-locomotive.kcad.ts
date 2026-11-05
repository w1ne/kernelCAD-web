// SPDX-License-Identifier: CC0-1.0
// Underground mine locomotive: Low-profile mine locomotive with enclosed cab, buffer ends, chassis, and paired wheel trucks. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "mine-locomotive",
  license: 'CC0-1.0',
  title: "Underground mine locomotive",
  description: "Low-profile mine locomotive with enclosed cab, buffer ends, chassis, and paired wheel trucks. Controls: overall scale, coated equipment steel, structural steel, rubber, instrument glass; weathered and highVisibility presets.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const coatedSteel = param('coatedSteel', '#aa6530', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#566168', { label: 'Structural steel' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber' });
const instrumentGlass = param('instrumentGlass', '#5c929c', { label: 'Instrument glass' });
presets({
  weathered: { coatedSteel: '#6c716d', structuralSteel: '#666a66', rubber: '#393a38', instrumentGlass: '#55787d' },
  highVisibility: { coatedSteel: '#e48a1e', structuralSteel: '#465159', rubber: '#24282a', instrumentGlass: '#5fb6c1' },
});
const baseZ=5;
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

const p=assembly("mine-locomotive");
p.part("chassis", b(0, 0, 70, 900, 350, 140).color(structuralSteel));
p.part("cab", b(-190, 0, 210, 360, 320, 360).color(coatedSteel));
p.part("cab-roof", b(-190, 0, 570, 420, 370, 55).color(coatedSteel));
p.part("front-buffer", b(455, 0, 120, 55, 440, 90).color(coatedSteel));
p.part("rear-buffer", b(-455, 0, 120, 55, 440, 90).color(coatedSteel));
p.part("front-wheel-near", hy(270, -190, 115, 90, 110, 8).color(rubber));
p.part("front-wheel-far", hy(270, 190, 115, 90, 110, 8).color(rubber));
p.part("rear-wheel-near", hy(-270, -190, 115, 90, 110, 8).color(rubber));
p.part("rear-wheel-far", hy(-270, 190, 115, 90, 110, 8).color(rubber));
p.part("battery-box", b(80, 0, 180, 220, 270, 180).color(coatedSteel));

p.part("cab-side-window-near", b(-190,-166,390,220,14,120).color(instrumentGlass));
p.part("cab-side-window-far", b(-190,166,390,220,14,120).color(instrumentGlass));
p.part("cab-front-window", b(-9,0,390,14,190,120).color(instrumentGlass));

return p.model();
