// SPDX-License-Identifier: CC0-1.0
// Regolith sieve tray: Shallow field sieve tray with raised rim, crossed support legs and a central mesh panel. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "regolith-sieve",
  license: 'CC0-1.0',
  title: "Regolith sieve tray",
  description: "Shallow field sieve tray with raised rim, crossed support legs and a central mesh panel. Material controls: paint, aluminum, stainless steel; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 836,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#a69878", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const stainlessSteel = param('stainlessSteel', "#758589", { label: "Stainless sieve mesh" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "stainlessSteel": "#8c8b80"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "stainlessSteel": "#d5aa42"},
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

const p = assembly("regolith-sieve");
p.part("mesh",b(0,0,250.4042241525917,640,480,24).color(stainlessSteel));
p.part("rim-0",b(-240,0,290.4042241525917,24,500,65).color(aluminum));
p.part("rim-1",b(-80,0,290.4042241525917,24,500,65).color(aluminum));
p.part("rim-2",b(80,0,290.4042241525917,24,500,65).color(aluminum));
p.part("rim-3",b(240,0,290.4042241525917,24,500,65).color(aluminum));
p.part("rim-side-a",b(0,-230,290.4042241525917,640,24,65).color(paint));
p.part("rim-side-b",b(0,230,290.4042241525917,640,24,65).color(paint));
p.part("leg--220",br(-220,0,0.404224152591695,55,55,500,0,-10).color(aluminum));
p.part("leg-220",br(220,0,0.404224152591695,55,55,500,0,-10).color(aluminum));

return p.model();
