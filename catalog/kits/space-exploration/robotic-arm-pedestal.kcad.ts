// SPDX-License-Identifier: CC0-1.0
// Instrument arm pedestal: Supported two-link arm with separate shoulder, elbow and wrist pivots ending in paired gripper fingers. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "robotic-arm-pedestal",
  license: 'CC0-1.0',
  title: "Instrument arm pedestal",
  description: "Two supported instrument-arm links rise from a turntable through distinct shoulder and wrist pivots to a paired polymer gripper. Material controls: paint, aluminum, polymer; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#c9783b", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const polymer = param('polymer', "#536c76", { label: "Polymer gripper fingers" });

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
const cy = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(0,0,-h/2).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("robotic-arm-pedestal");
p.part("base",b(0,0,0,520,520,70).color(paint));
p.part("turntable",c(0,0,35,90,180,8).color(paint));
p.part("support-column",c(0,0,110,240,112,10).color(aluminum));
p.part("lower-link",b(0,0,330,185,150,420).color(paint));
p.part("shoulder-pivot",cy(0,0,405,190,104).color(aluminum));
p.part("forearm",b(225,0,620,430,135,115).color(paint));
p.part("elbow-pivot",cy(25,0,660,170,104).color(aluminum));
p.part("wrist-pivot",cy(410,0,665,150,76).color(aluminum));
p.part("tool-palm",b(500,0,625,150,190,90).color(aluminum));
p.part("gripper-finger-left",b(620,70,620,150,24,110).color(polymer));
p.part("gripper-finger-right",b(620,-70,620,150,24,110).color(polymer));
return p.model();
