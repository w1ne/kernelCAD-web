// SPDX-License-Identifier: CC0-1.0
// Landing zone marker: Low landing-zone marker with a broad base plate and raised guide posts at each corner. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "landing-pad-marker",
  license: 'CC0-1.0',
  title: "Landing zone marker",
  description: "Low landing-zone marker with a broad base plate and raised guide posts at each corner. Material controls: paint, aluminum, warningAmber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 584,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#bd9750", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const warningAmber = param('warningAmber', "#d9aa36", { label: "Warning amber" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "warningAmber": "#d3bd82"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "warningAmber": "#f0b72f"},
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

const p = assembly("landing-pad-marker");
p.part("plate",b(0,0,0,1200,1200,50).color(paint));
p.part("post--460--460",b(-460,-460,25,70,70,370).color(aluminum));
p.part("post--460-460",b(-460,460,25,70,70,370).color(aluminum));
p.part("post-460--460",b(460,-460,25,70,70,370).color(aluminum));
p.part("post-460-460",b(460,460,25,70,70,370).color(aluminum));
p.part("center",b(0,0,30,320,320,20).color(warningAmber));

return p.model();
