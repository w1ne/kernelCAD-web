// SPDX-License-Identifier: CC0-1.0
// Pressurized tunnel collar: Circular tunnel connection ring with broad flange, inner lip and four bolt bosses. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "pressurized-tunnel-collar",
  license: 'CC0-1.0',
  title: "Pressurized tunnel collar",
  description: "Circular tunnel connection ring with broad flange, inner lip and four bolt bosses. Material controls: paint, aluminum, rubber; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 708,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#7c8585", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const rubber = param('rubber', "#34383a", { label: "Rubber pressure seal" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "rubber": "#514d44"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "rubber": "#252a2c"},
});

const ngon = (r: number,n: number) => { let p = path().moveTo(r,0); for (let k=1;k<n;k++) { const a=2*Math.PI*k/n; p=p.lineTo(r*Math.cos(a),r*Math.sin(a)); } return p.close(); };
const cylShape = (h: number,r: number,n=8) => {
  const levels = [0,h*0.08,h*0.92,h]; const radii = [r*0.86,r,r,r*0.86];
  const profiles = levels.map((_,i) => ngon(radii[i],n));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const c = (x: number,y: number,z: number,h: number,r: number,n=8) => cylShape(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("pressurized-tunnel-collar");
p.part("flange",c(0,0,0,85,410,12).color(paint));
p.part("inner-lip",c(0,0,85,45,340,12).color(rubber));
p.part("bolt-0",c(0,-370,0,70,28,8).color(aluminum));
p.part("bolt-1",c(370,0,0,70,28,8).color(aluminum));
p.part("bolt-2",c(0,370,0,70,28,8).color(aluminum));
p.part("bolt-3",c(-370,0,0,70,28,8).color(aluminum));

return p.model();
