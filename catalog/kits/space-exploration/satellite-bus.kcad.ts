// SPDX-License-Identifier: CC0-1.0
// Satellite bus: Rectangular satellite bus with corner rails, top sensor block and two side panel mounts. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "satellite-bus",
  license: 'CC0-1.0',
  title: "Satellite bus",
  description: "Rectangular satellite bus with corner rails, top sensor block and two side panel mounts. Material controls: paint, aluminum, glass; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#aaa99c", { label: "Painted shell" });
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

const p = assembly("satellite-bus");
p.part("bus",b(0,0,30,700,600,600).color(paint));
p.part("top-sensor",b(0,0,350,260,260,100).color(glass));
p.part("corner--320--270",b(-320,-270,0,40,40,660).color(paint));
p.part("corner--320-270",b(-320,270,0,40,40,660).color(paint));
p.part("corner-320--270",b(320,-270,0,40,40,660).color(paint));
p.part("corner-320-270",b(320,270,0,40,40,660).color(paint));
p.part("panel-mount-left",b(-430,0,110,180,60,80).color(aluminum));
p.part("panel-mount-right",b(430,0,110,180,60,80).color(aluminum));

return p.model();
