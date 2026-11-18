// SPDX-License-Identifier: CC0-1.0
// Sample cassette carrier: Stackable sample cassette with four open cell blocks and a raised handle ridge. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "sample-cassette",
  license: 'CC0-1.0',
  title: "Sample cassette carrier",
  description: "Stackable sample cassette with four open cell blocks and a raised handle ridge. Material controls: paint, aluminum, polymer; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#9b9078", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const polymer = param('polymer', "#536c76", { label: "Polymer sample cells" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "polymer": "#7a8279"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "polymer": "#d4a63f"},
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

const p = assembly("sample-cassette");
p.part("base",b(0,0,0,720,500,50).color(paint));
p.part("cell-0",b(-240,0,35,140,400,90).color(polymer));
p.part("cell-1",b(-80,0,35,140,400,90).color(polymer));
p.part("cell-2",b(80,0,35,140,400,90).color(polymer));
p.part("cell-3",b(240,0,35,140,400,90).color(polymer));
p.part("handle",b(0,0,145,520,55,45).color(aluminum));
p.part("end-left",b(-350,0,45,40,520,110).color(paint));
p.part("end-right",b(350,0,45,40,520,110).color(paint));

return p.model();
