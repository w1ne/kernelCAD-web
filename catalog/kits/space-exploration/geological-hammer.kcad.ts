// SPDX-License-Identifier: CC0-1.0
// Geological sampling hammer: Compact geology hammer with a broad head, tapered handle and pommel block. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "geological-hammer",
  license: 'CC0-1.0',
  title: "Geological sampling hammer",
  description: "Compact geology hammer with a broad head, tapered handle and pommel block. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#777a77", { label: "Painted shell" });
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
const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);

const p = assembly("geological-hammer");
p.part("head",b(0,0,560,380,120,125).color(paint));
p.part("pick",br(-230,0,560,140,90,65,0,-12).color(aluminum));
p.part("handle",br(0,0,260,95,95,520,0,12).color(aluminum));
p.part("grip",b(0,0,50,120,120,180).color(rubber));
p.part("pommel",b(0,0,0,140,140,60).color(paint));

return p.model();
