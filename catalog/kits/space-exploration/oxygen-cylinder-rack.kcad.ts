// SPDX-License-Identifier: CC0-1.0
// Oxygen cylinder rack: Two-cylinder service rack with retaining hoops, bottom tray and lifting bar. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "oxygen-cylinder-rack",
  license: 'CC0-1.0',
  title: "Oxygen cylinder rack",
  description: "Two upright oxygen cylinders sit in a retaining frame with bottom tray, lifting bar and paired brass valve fittings. Material controls: paint, aluminum, brass; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 680,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#5d8f6d", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const brass = param('brass', "#b8873a", { label: "Brass cylinder valves" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "brass": "#c0a573"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "brass": "#e1b83a"},
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
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("oxygen-cylinder-rack");
p.part("tray",b(0,0,35,620,300,70).color(paint));
p.part("cylinder-0",c(-150,0,105,820,110,8).color(paint));
p.part("cylinder-1",c(150,0,105,820,110,8).color(paint));
p.part("valve-0",c(-150,-70,905,70,34,8).color(brass));
p.part("valve-1",c(150,-70,905,70,34,8).color(brass));
p.part("top-bar",b(0,0,960,650,50,55).color(aluminum));
p.part("back",b(0,100,480,600,35,780).color(paint));
p.part("foot--270",b(-270,0,0,90,100,70).color(aluminum));
p.part("foot-270",b(270,0,0,90,100,70).color(aluminum));

return p.model();
