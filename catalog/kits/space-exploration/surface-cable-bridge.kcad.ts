// SPDX-License-Identifier: CC0-1.0
// Surface cable bridge: Low protective cable bridge with paired ramps, central cover and side guard lips. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "surface-cable-bridge",
  license: 'CC0-1.0',
  title: "Surface cable bridge",
  description: "Low protective cable bridge with paired ramps, central cover and side guard lips. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#817d6e", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const rubber = param('rubber', "#34383a", { label: "Rubber cable-protection lips" });

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
const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);

const p = assembly("surface-cable-bridge");
p.part("cover",b(0,0,102.61216568144613,720,420,130).color(aluminum));
p.part("ramp-left",br(-490,0,52.61216568144613,360,420,70,0,-18).color(paint));
p.part("ramp-right",br(490,0,52.61216568144613,360,420,70,0,18).color(paint));
p.part("lip-left",b(0,-215,167.61216568144613,720,30,70).color(rubber));
p.part("lip-right",b(0,215,167.61216568144613,720,30,70).color(rubber));

return p.model();
