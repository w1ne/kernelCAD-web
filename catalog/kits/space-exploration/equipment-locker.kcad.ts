// SPDX-License-Identifier: CC0-1.0
// Field equipment locker: Tall equipment locker with double doors, top lip and four compact feet. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "equipment-locker",
  license: 'CC0-1.0',
  title: "Field equipment locker",
  description: "Tall equipment locker with double doors, top lip and four compact feet. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 584,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#8c887a", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const rubber = param('rubber', "#34383a", { label: "Rubber leveling feet" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "rubber": "#514d44"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "rubber": "#252a2c"},
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

const p = assembly("equipment-locker");
p.part("body",b(0,0,100,800,500,1450).color(paint));
p.part("top",b(0,0,1550,860,560,70).color(aluminum));
p.part("door-left",b(-195,-260,140,370,18,1240).color(paint));
p.part("door-right",b(195,-260,140,370,18,1240).color(paint));
p.part("foot--300",b(-300,0,0,100,100,100).color(rubber));
p.part("foot-300",b(300,0,0,100,100,100).color(rubber));

return p.model();
