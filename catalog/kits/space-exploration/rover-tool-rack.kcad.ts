// SPDX-License-Identifier: CC0-1.0
// Rover tool rack: Open rack with three long tool channels, end stops and four mounting feet. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "rover-tool-rack",
  license: 'CC0-1.0',
  title: "Rover tool rack",
  description: "Open rack with three long tool channels, end stops and four mounting feet. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#6c7475", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const rubber = param('rubber', "#34383a", { label: "Rubber tool-channel liners" });

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

const p = assembly("rover-tool-rack");
p.part("base",b(0,0,80,880,420,90).color(paint));
p.part("channel-0",b(0,-140,170,760,54,70).color(rubber));
p.part("channel-1",b(0,0,170,760,54,70).color(rubber));
p.part("channel-2",b(0,140,170,760,54,70).color(rubber));
p.part("end-left",b(-400,0,220,50,460,250).color(paint));
p.part("end-right",b(400,0,220,50,460,250).color(paint));
p.part("foot--340",b(-340,0,0,100,120,80).color(aluminum));
p.part("foot-340",b(340,0,0,100,120,80).color(aluminum));

return p.model();
