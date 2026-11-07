// SPDX-License-Identifier: CC0-1.0
// Peristaltic dosing pump: Bench-mounted metering pump with circular pump head, tubing guide and raised controller housing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "peristaltic-dosing-pump",
  license: 'CC0-1.0',
  title: "Peristaltic dosing pump",
  description: "Bench-mounted metering pump with circular pump head, tubing guide and raised controller housing. Parameters: overall scale, powder-coated steel, pvc, polymer, rubber; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const pvc=param('pvc','#c7d4ca',{label:'PVC'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
const rubber=param('rubber','#323a3d',{label:'Rubber'});
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa', rubber:'#4b504e'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b', rubber:'#262d30'},
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const section=(radius:number,sides:number)=>{
  let outline=path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for(let k=1;k<sides;k++){
    const angle=Math.PI/2+(2*Math.PI*k)/sides;
    outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder=(height:number,radius:number,sides:number)=>{
  const levels=[0,height*0.08,height*0.92,height];
  const radii=[radius*0.9,radius,radius,radius*0.9];
  const profiles=levels.map((_,index)=>section(radii[index],sides));
  return profiles[0].loft(profiles.slice(1),{
    planes:levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const c=(x:number,y:number,z:number,h:number,r:number,s:number)=>loftCylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("peristaltic-dosing-pump");
p.part("mounting-foot", b(0,0,0,360,300,55).color(powderCoatedSteel));
p.part("pump-base", b(0,0,55,340,240,210).color(powderCoatedSteel));
p.part("controller", b(0,120,265,250,100,210).color(rubber));
p.part("screen-bezel", b(0,175,360,155,22,90).color(polymer));
p.part("tubing-guide-left", b(-185,-30,170,42,180,42).color(rubber));
p.part("tubing-guide-right", b(185,-30,170,42,180,42).color(rubber));
p.part("pump-head", c(0,-150,110,205,110,10).color(polymer));
p.part("rotor-cap", c(0,-150,315,54,45,10).color(powderCoatedSteel));
p.part("tube-inlet", c(-220,-60,205,150,22,10).color(pvc));
p.part("tube-outlet", c(220,-60,205,150,22,10).color(pvc));

return p.model();
