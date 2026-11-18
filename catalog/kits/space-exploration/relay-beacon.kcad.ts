// SPDX-License-Identifier: CC0-1.0
// Relay beacon: Standalone relay beacon with a capped post, indicator box and four low anchor tabs. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "relay-beacon",
  license: 'CC0-1.0',
  title: "Relay beacon",
  description: "Standalone relay beacon with a capped post, indicator box and four low anchor tabs. Material controls: paint, aluminum, glass; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 758,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#dfb84d", { label: "Painted shell" });
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
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("relay-beacon");
p.part("base",b(0,0,30,320,320,60).color(paint));
p.part("post",c(0,0,60,720,55,8).color(aluminum));
p.part("beacon",b(0,0,810,260,260,220).color(glass));
p.part("cap",b(0,0,930,300,300,40).color(aluminum));
p.part("anchor-0",b(120,120,0,70,70,30).color(paint));
p.part("anchor-1",b(-120,120,0,70,70,30).color(paint));
p.part("anchor-2",b(120,-120,0,70,70,30).color(paint));
p.part("anchor-3",b(-120,-120,0,70,70,30).color(paint));

return p.model();
