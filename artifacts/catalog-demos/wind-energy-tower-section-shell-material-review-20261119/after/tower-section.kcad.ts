// SPDX-License-Identifier: CC0-1.0
// Tapered tower section. One painted steel tower shell that narrows from a flared lower flange collar to an upper joint band, with an access door panel set into the wall. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "tower-section",
  license: 'CC0-1.0',
  title: "Tapered tower section",
  description: "Single tapered steel tower segment with a painted shell, a flared lower flange collar, an upper joint band and an access door panel. Controls: scale and tower paint, flange steel, painted steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const towerPaint = param('towerPaint', '#e2e5e3', { label: 'Tower paint' });
const flangeSteel = param('flangeSteel', '#7f8b8e', { label: 'Flange steel' });
const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });

presets({
  weathered: {"towerPaint": "#c8ccc7", "flangeSteel": "#6f6a62", "paintedSteel": "#415961"},
  highVisibility: {"paintedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);
// Twelve-sided ring with a flat that faces -Y, where the access panel sits.
const ring=(r:number)=>{
  const at=(k:number)=>(Math.PI*(2*k+1))/12;
  let s=path().moveTo(r*Math.cos(at(0)),r*Math.sin(at(0)));
  for(let k=1;k<12;k++)s=s.lineTo(r*Math.cos(at(k)),r*Math.sin(at(k)));
  return s.close();
};
// Shell that narrows from the base radius to the top radius.
const taper=(z:number,h:number,r0:number,r1:number)=>ring(r0).loft(ring(r1),{spacing:h,ruled:true}).translate(0,0,z).scale(scale);

const p=assembly("tower-section");
p.part("shaft",taper(50,1700,150,110).color(towerPaint));
p.part("lower-collar",c(0,0,0,200,180,8).color(flangeSteel));
p.part("upper-band",c(0,0,1620,120,135,8).color(flangeSteel));
p.part("access-panel",b(0,-128,500,180,20,350).color(paintedSteel));

return p.model();
