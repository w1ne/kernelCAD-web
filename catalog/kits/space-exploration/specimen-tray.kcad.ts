// SPDX-License-Identifier: CC0-1.0
// Geology specimen tray: Shallow specimen tray divided into six sample cells with reinforced corner blocks. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "specimen-tray",
  license: 'CC0-1.0',
  title: "Geology specimen tray",
  description: "Shallow specimen tray divided into six sample cells with reinforced corner blocks. Material controls: paint, aluminum; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 920,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#aa9d7d", { label: "Painted shell" });
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

const p = assembly("specimen-tray");
p.part("base",b(0,0,30,780,520,60).color(aluminum));
p.part("divider-x-0",b(-180,0,100,24,480,80).color(paint));
p.part("divider-x-1",b(0,0,100,24,480,80).color(paint));
p.part("divider-x-2",b(180,0,100,24,480,80).color(paint));
p.part("divider-y-a",b(0,-120,100,760,24,80).color(paint));
p.part("divider-y-b",b(0,120,100,760,24,80).color(paint));
p.part("corner-0",b(-360,-230,0,60,60,35).color(paint));
p.part("corner-1",b(360,-230,0,60,60,35).color(paint));
p.part("corner-2",b(-360,230,0,60,60,35).color(paint));
p.part("corner-3",b(360,230,0,60,60,35).color(paint));

return p.model();
