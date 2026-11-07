// SPDX-License-Identifier: CC0-1.0
// Satellite solar wing: Deployable satellite panel wing with a central spine and three framed panel sections. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "satellite-solar-wing",
  license: 'CC0-1.0',
  title: "Satellite solar wing",
  description: "Deployable satellite panel wing with a central spine and three framed panel sections. Material controls: paint, aluminum, solarCell; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#46556a", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const solarCell = param('solarCell', "#304d70", { label: "Solar cells" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "solarCell": "#52647b"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "solarCell": "#244267"},
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

const p = assembly("satellite-solar-wing");
p.part("spine",b(0,0,0,90,1100,70).color(paint));
p.part("panel-0",b(0,-360,65,620,300,28).color(solarCell));
p.part("panel-1",b(0,0,65,620,300,28).color(solarCell));
p.part("panel-2",b(0,360,65,620,300,28).color(solarCell));
p.part("crossbar-0",b(0,-360,20,650,38,30).color(aluminum));
p.part("crossbar-1",b(0,0,20,650,38,30).color(aluminum));
p.part("crossbar-2",b(0,360,20,650,38,30).color(aluminum));
p.part("crossbar-3",b(0,720,20,650,38,30).color(aluminum));

return p.model();
