// SPDX-License-Identifier: CC0-1.0
// Portable science console: Field console with tilted-looking display housing, top rail and four low mounting feet. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "portable-science-console",
  license: 'CC0-1.0',
  title: "Portable science console",
  description: "Field console with tilted-looking display housing, top rail and four low mounting feet. Material controls: paint, aluminum, glass; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#66716e", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const glass = param('glass', "#548b9a", { label: "Optical glass" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "glass": "#7b9ba0"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "glass": "#63a9b8"},
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

const p = assembly("portable-science-console");
p.part("base",b(0,0,40,650,500,80).color(paint));
p.part("body",b(0,0,250,600,420,360).color(paint));
p.part("screen",br(0,-215,510,390,18,190,-12,0).color(glass));
p.part("hood",br(0,-150,620,500,120,45,-12,0).color(paint));
p.part("foot--250--180",b(-250,-180,0,90,90,40).color(aluminum));
p.part("foot--250-180",b(-250,180,0,90,90,40).color(aluminum));
p.part("foot-250--180",b(250,-180,0,90,90,40).color(aluminum));
p.part("foot-250-180",b(250,180,0,90,90,40).color(aluminum));

return p.model();
