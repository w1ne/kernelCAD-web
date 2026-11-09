// SPDX-License-Identifier: CC0-1.0
// Rover charging dock: Low charging dock with guide rails, raised connector post and two anchor pads. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "rover-charging-dock",
  license: 'CC0-1.0',
  title: "Rover charging dock",
  description: "Low charging dock with guide rails, raised connector post and two anchor pads. Material controls: paint, aluminum, polymer; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 674,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#58676b", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const polymer = param('polymer', "#536c76", { label: "Polymer connector insulator" });

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
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("rover-charging-dock");
p.part("base",b(0,0,60,1150,700,120).color(paint));
p.part("guide-left",b(0,-280,130,1050,70,90).color(paint));
p.part("guide-right",b(0,280,130,1050,70,90).color(paint));
p.part("post",c(0,250,180,540,95,8).color(aluminum));
p.part("connector",b(0,180,650,180,160,120).color(polymer));
p.part("anchor--460",b(-460,0,0,120,180,60).color(paint));
p.part("anchor-460",b(460,0,0,120,180,60).color(paint));

return p.model();
