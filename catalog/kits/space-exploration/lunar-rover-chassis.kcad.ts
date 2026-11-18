// SPDX-License-Identifier: CC0-1.0
// Lunar rover chassis: Six-wheel lunar rover with a raised equipment bay, paired rocker links, exposed suspension and a forward navigation camera. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "lunar-rover-chassis",
  license: 'CC0-1.0',
  title: "Lunar rover chassis",
  description: "Six-wheel lunar rover with a raised equipment bay, paired rocker links, exposed suspension and a forward navigation camera. Material controls: paint, aluminum, rubber, glass; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2152,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#e87832", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const rubber = param('rubber', "#34383a", { label: "Rubber" });
const glass = param('glass', "#548b9a", { label: "Optical glass" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "rubber": "#514d44", "glass": "#7b9ba0"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "rubber": "#34383a", "glass": "#63a9b8"},
});

const octRect = (w: number, d: number, c: number) => path().moveTo(-w/2+c,-d/2).lineTo(w/2-c,-d/2).lineTo(w/2,-d/2+c).lineTo(w/2,d/2-c).lineTo(w/2-c,d/2).lineTo(-w/2+c,d/2).lineTo(-w/2,d/2-c).lineTo(-w/2,-d/2+c).close();
const boxShape = (w: number, d: number, h: number) => {
  const bevel = Math.min(w,d,h) * 0.06;
  const levels = [-h/2,-h/2+bevel,h/2-bevel,h/2];
  const insets = [bevel,0,0,bevel];
  const profiles = levels.map((_,i) => octRect(w-2*insets[i],d-2*insets[i],Math.min(w-2*insets[i],d-2*insets[i])*0.06));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => boxShape(w,d,h).translate(x,y,z+h/2).scale(scale);
const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);
const wheelX = (x: number,y: number,z: number,w: number,r: number,n=12) => cylShape(w,r,n).translate(0,0,-w/2).rotateY(90).translate(x,y,z).scale(scale);

const p = assembly("lunar-rover-chassis");
p.part("deck",b(0,0,430.0,1150,700,100).color(paint));
p.part("equipment-bay",b(0,25,530.0,500,420,210).color(paint));
p.part("instrument-cover",b(0,25,740.0,560,480,34).color(aluminum));
p.part("camera-mast",c(0,0,774.0,230,28,8).color(glass));
p.part("front-bumper",b(0,-390,310.0,1250,80,80).color(paint));
p.part("rear-rail",b(0,390,360.0,1100,45,110).color(aluminum));
p.part("rocker--1",b(-560,0,210.0,55,570,55).color(aluminum));
p.part("rocker-1",b(560,0,210.0,55,570,55).color(aluminum));
p.part("suspension--1--250",br(-520,-250,220.0,230,45,45,0,-11).color(aluminum));
p.part("suspension--1-0",br(-520,0,220.0,230,45,45,0,-11).color(aluminum));
p.part("suspension--1-250",br(-520,250,220.0,230,45,45,0,-11).color(aluminum));
p.part("suspension-1--250",br(520,-250,220.0,230,45,45,0,11).color(aluminum));
p.part("suspension-1-0",br(520,0,220.0,230,45,45,0,11).color(aluminum));
p.part("suspension-1-250",br(520,250,220.0,230,45,45,0,11).color(aluminum));
p.part("wheel--1--250",wheelX(-640,-250,180.0,150,180,12).color(rubber));
p.part("wheel--1-0",wheelX(-640,0,180.0,150,180,12).color(rubber));
p.part("wheel--1-250",wheelX(-640,250,180.0,150,180,12).color(rubber));
p.part("wheel-1--250",wheelX(640,-250,180.0,150,180,12).color(rubber));
p.part("wheel-1-0",wheelX(640,0,180.0,150,180,12).color(rubber));
p.part("wheel-1-250",wheelX(640,250,180.0,150,180,12).color(rubber));
p.part("navigation-camera",b(0,-410,455.0,150,85,95).color(glass));

return p.model();
