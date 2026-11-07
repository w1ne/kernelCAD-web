// SPDX-License-Identifier: CC0-1.0
// Dust protection screen: Portable low dust screen with three panels, side rails and broad floor skids. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "dust-protection-screen",
  license: 'CC0-1.0',
  title: "Dust protection screen",
  description: "Portable low dust screen with three panels, side rails and broad floor skids. Material controls: paint, aluminum; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 668,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#89877e", { label: "Painted shell" });
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
const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);

const p = assembly("dust-protection-screen");
p.part("panel-0",br(-360,0,390,320,45,780,0,-7).color(paint));
p.part("panel-1",br(0,0,390,320,45,780,0,0).color(paint));
p.part("panel-2",br(360,0,390,320,45,780,0,7).color(paint));
p.part("top-rail",b(0,0,800,1080,65,55).color(aluminum));
p.part("bottom-rail",b(0,0,15,1080,65,30).color(aluminum));
p.part("skid-left",b(-360,0,0,180,500,50).color(aluminum));
p.part("skid-right",b(360,0,0,180,500,50).color(aluminum));

return p.model();
