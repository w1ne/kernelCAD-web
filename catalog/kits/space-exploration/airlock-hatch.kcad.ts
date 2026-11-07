// SPDX-License-Identifier: CC0-1.0
// Airlock hatch: Circular pressure-door prop with an outer rim, central disk, handle and locking lugs. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "airlock-hatch",
  license: 'CC0-1.0',
  title: "Airlock hatch",
  description: "Circular pressure-door prop with an outer rim, central disk, handle and locking lugs. Material controls: paint, aluminum; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 1150,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#737c7d", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255"},
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

const p = assembly("airlock-hatch");
p.part("rim",c(0,0,0,55,360,12).color(aluminum));
p.part("door",c(0,0,55,40,300,12).color(paint));
p.part("handle",b(0,-315,95,140,25,42).color(aluminum));
p.part("lug-0",c(0,-340,55,65,34,8).color(aluminum));
p.part("lug-1",c(240,-240,55,65,34,8).color(aluminum));
p.part("lug-2",c(340,0,55,65,34,8).color(aluminum));
p.part("lug-3",c(240,240,55,65,34,8).color(aluminum));
p.part("lug-4",c(0,340,55,65,34,8).color(aluminum));
p.part("lug-5",c(-240,240,55,65,34,8).color(aluminum));
p.part("lug-6",c(-340,0,55,65,34,8).color(aluminum));
p.part("lug-7",c(-240,-240,55,65,34,8).color(aluminum));

return p.model();
