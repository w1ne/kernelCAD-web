// SPDX-License-Identifier: CC0-1.0
// Orbital communication dish: Compact satellite with a forward-tilted reflector, projecting feed horn, support arm and two solar-panel wings. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "orbital-communication-dish",
  license: 'CC0-1.0',
  title: "Orbital communication dish",
  description: "Compact satellite with a forward-tilted reflector, projecting feed horn, support arm and two solar-panel wings. Material controls: paint, aluminum, solarCell, reflector; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 663,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#d97835", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });
const solarCell = param('solarCell', "#304d70", { label: "Solar cells" });
const reflector = param('reflector', "#eef1f1", { label: "Reflective aluminum" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "solarCell": "#52647b", "reflector": "#f5f6f4"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "solarCell": "#244267", "reflector": "#dce9ee"},
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
const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);
const dishShape = (h: number,r: number,n=12) => {
  const levels = [0,h*0.16,h*0.62,h]; const radii = [r*0.16,r*0.48,r*0.82,r];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const dish = (x: number,y: number,z: number,h: number,r: number,n=12) => dishShape(h,r,n).rotateX(55).translate(x,y,z).scale(scale);

const p = assembly("orbital-communication-dish");
p.part("bus",b(0,0,0,420,420,440).color(paint));
p.part("dish",dish(0,-520,430,60,320,12).color(reflector));
p.part("arm",br(0,-330,200,60,400,50,-24,0).color(aluminum));
p.part("feed",c(0,-790,560,100,48,10).color(aluminum));
p.part("panel-left",b(-520,0,40,560,40,400).color(solarCell));
p.part("panel-right",b(520,0,40,560,40,400).color(solarCell));

return p.model();
