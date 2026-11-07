// SPDX-License-Identifier: CC0-1.0
// Field science worktable: Compact science worktable with a broad deck, four legs, lower shelf and instrument rail. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "science-worktable",
  license: 'CC0-1.0',
  title: "Field science worktable",
  description: "Compact science worktable with a broad deck, four legs, lower shelf and instrument rail. Material controls: paint, aluminum; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 668,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#817663", { label: "Painted shell" });
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

const p = assembly("science-worktable");
p.part("top",b(0,0,760,1100,700,70).color(paint));
p.part("shelf",b(0,0,300,900,520,50).color(paint));
p.part("leg--470--270",b(-470,-270,0,70,70,760).color(aluminum));
p.part("leg--470-270",b(-470,270,0,70,70,760).color(aluminum));
p.part("leg-470--270",b(470,-270,0,70,70,760).color(aluminum));
p.part("leg-470-270",b(470,270,0,70,70,760).color(aluminum));
p.part("rail",b(0,310,900,1000,45,60).color(aluminum));

return p.model();
