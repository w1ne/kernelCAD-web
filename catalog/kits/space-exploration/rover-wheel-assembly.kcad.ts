// SPDX-License-Identifier: CC0-1.0
// Rover wheel assembly: Oversized low-pressure rover wheel with a broad tire, inset hub and twelve separated traction bars around the circumference. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "rover-wheel-assembly",
  license: 'CC0-1.0',
  title: "Rover wheel assembly",
  description: "Oversized low-pressure rover wheel with a broad tire, inset hub and twelve separated traction bars around the circumference. Material controls: aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 1335,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const rubber = param('rubber', "#34383a", { label: "Rubber" });

presets({
  lunarDust: {"aluminum": "#c3c5c3", "rubber": "#514d44"},
  highVisibility: {"aluminum": "#d8b255", "rubber": "#34383a"},
});

const octRect = (w: number, d: number, c: number) => path().moveTo(-w/2+c,-d/2).lineTo(w/2-c,-d/2).lineTo(w/2,-d/2+c).lineTo(w/2,d/2-c).lineTo(w/2-c,d/2).lineTo(-w/2+c,d/2).lineTo(-w/2,d/2-c).lineTo(-w/2,-d/2+c).close();
const boxShape = (w: number, d: number, h: number) => {
  const bevel = Math.min(w,d,h) * 0.06;
  const levels = [-h/2,-h/2+bevel,h/2-bevel,h/2];
  const insets = [bevel,0,0,bevel];
  const profiles = levels.map((_,i) => octRect(w-2*insets[i],d-2*insets[i],Math.min(w-2*insets[i],d-2*insets[i])*0.06));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const br = (x: number,y: number,z: number,w: number,d: number,h: number,rx=0,ry=0) => boxShape(w,d,h).rotateX(rx).rotateY(ry).translate(x,y,z+h/2).scale(scale);
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const wheelY = (x: number,y: number,z: number,w: number,r: number,n=12) => cylShape(w,r,n).translate(0,0,-w/2).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("rover-wheel-assembly");
p.part("tire",wheelY(0,0,334,170,300,12).color(rubber));
p.part("hub",wheelY(0,0,334,50,110,10).color(aluminum));
p.part("tread-0",br(0.000,0,640.000,150,170,28,0,0.000).color(rubber));
p.part("tread-1",br(160.000,0,597.128,150,170,28,0,30.000).color(rubber));
p.part("tread-2",br(277.128,0,480.000,150,170,28,0,60.000).color(rubber));
p.part("tread-3",br(320.000,0,320.000,150,170,28,0,90.000).color(rubber));
p.part("tread-4",br(277.128,0,160.000,150,170,28,0,120.000).color(rubber));
p.part("tread-5",br(160.000,0,42.872,150,170,28,0,150.000).color(rubber));
p.part("tread-6",br(0.000,0,0.000,150,170,28,0,180.000).color(rubber));
p.part("tread-7",br(-160.000,0,42.872,150,170,28,0,210.000).color(rubber));
p.part("tread-8",br(-277.128,0,160.000,150,170,28,0,240.000).color(rubber));
p.part("tread-9",br(-320.000,0,320.000,150,170,28,0,270.000).color(rubber));
p.part("tread-10",br(-277.128,0,480.000,150,170,28,0,300.000).color(rubber));
p.part("tread-11",br(-160.000,0,597.128,150,170,28,0,330.000).color(rubber));

return p.model();
