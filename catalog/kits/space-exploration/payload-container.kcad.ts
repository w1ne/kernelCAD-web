// SPDX-License-Identifier: CC0-1.0
// Instrument payload container: Square instrument payload canister with lid rim, corner rails and a recessed front panel. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "payload-container",
  license: 'CC0-1.0',
  title: "Instrument payload container",
  description: "Square instrument payload canister with lid rim, corner rails and a recessed front panel. Material controls: paint, aluminum; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 668,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#8b8067", { label: "Painted shell" });
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

const p = assembly("payload-container");
p.part("body",b(0,0,0,760,760,900).color(aluminum));
p.part("lid",b(0,0,900,820,820,100).color(paint));
p.part("corner--330--330",b(-330,-330,20,45,45,900).color(paint));
p.part("corner--330-330",b(-330,330,20,45,45,900).color(paint));
p.part("corner-330--330",b(330,-330,20,45,45,900).color(paint));
p.part("corner-330-330",b(330,330,20,45,45,900).color(paint));
p.part("panel",b(0,-390,250,430,20,350).color(paint));

return p.model();
