// SPDX-License-Identifier: CC0-1.0
// Surface storage shed: Boxy field storage module with double doors, roof lip and raised corner feet. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "surface-storage-shed",
  license: 'CC0-1.0',
  title: "Surface storage shed",
  description: "Boxy field storage module with double doors, roof lip and raised corner feet. Material controls: paint, aluminum, thermal blanket; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#8b8174", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const thermalBlanket = param('thermalBlanket', "#b4a77f", { label: "Insulated door panels" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "thermalBlanket": "#c7ba96"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "thermalBlanket": "#d8bd70"},
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

const p = assembly("surface-storage-shed");
p.part("body",b(0,0,100,1200,900,1500).color(paint));
p.part("roof",br(0,0,1600,1300,1000,80,0,2).color(paint));
p.part("door-left",b(-270,-460,140,500,24,1250).color(thermalBlanket));
p.part("door-right",b(270,-460,140,500,24,1250).color(thermalBlanket));
p.part("foot--500--350",b(-500,-350,0,120,120,100).color(aluminum));
p.part("foot--500-350",b(-500,350,0,120,120,100).color(aluminum));
p.part("foot-500--350",b(500,-350,0,120,120,100).color(aluminum));
p.part("foot-500-350",b(500,350,0,120,120,100).color(aluminum));

return p.model();
