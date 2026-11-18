// SPDX-License-Identifier: CC0-1.0
// Sample trailer cart: Low two-wheel sample trailer with a raised cargo bed, drawbar, retaining rails and wheels on a shared axle. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "sample-trailer-cart",
  license: 'CC0-1.0',
  title: "Sample trailer cart",
  description: "Low two-wheel sample trailer with a raised cargo bed, drawbar, retaining rails and wheels on a shared axle. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 937,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#8d8064", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const rubber = param('rubber', "#34383a", { label: "Rubber" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "rubber": "#514d44"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "rubber": "#34383a"},
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
const wheelY = (x: number,y: number,z: number,w: number,r: number,n=12) => cylShape(w,r,n).translate(0,0,-w/2).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("sample-trailer-cart");
p.part("bed",b(0,0,290.0,950,720,100).color(paint));
p.part("rail-0",b(-430,0,390.0,38,720,100).color(aluminum));
p.part("rail-1",b(-215,0,390.0,38,720,100).color(aluminum));
p.part("rail-2",b(0,0,390.0,38,720,100).color(aluminum));
p.part("rail-3",b(215,0,390.0,38,720,100).color(aluminum));
p.part("rail-4",b(430,0,390.0,38,720,100).color(aluminum));
p.part("drawbar",b(0,-520,190.0,90,520,70).color(aluminum));
p.part("wheel--1",wheelY(0,-390,210.0,120,210,12).color(rubber));
p.part("wheel-1",wheelY(0,390,210.0,120,210,12).color(rubber));

return p.model();
