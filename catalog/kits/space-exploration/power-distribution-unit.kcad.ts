// SPDX-License-Identifier: CC0-1.0
// Surface power distribution unit: Field power distribution box with two outlet panels, cable entries and raised roof. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "power-distribution-unit",
  license: 'CC0-1.0',
  title: "Surface power distribution unit",
  description: "Field power distribution box with two outlet panels, cable entries and raised roof. Material controls: paint, aluminum, polymer; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 685,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#7a8179", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const polymer = param('polymer', "#536c76", { label: "Polymer cable glands" });

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

const p = assembly("power-distribution-unit");
p.part("body",b(0,0,150,660,480,300).color(paint));
p.part("roof",b(0,0,330,700,520,60).color(aluminum));
p.part("panel-left",b(-150,-248,180,210,18,190).color(paint));
p.part("panel-right",b(150,-248,180,210,18,190).color(paint));
p.part("gland-0",c(-180,0,0,95,32,8).color(polymer));
p.part("gland-1",c(0,0,0,95,32,8).color(polymer));
p.part("gland-2",c(180,0,0,95,32,8).color(polymer));

return p.model();
