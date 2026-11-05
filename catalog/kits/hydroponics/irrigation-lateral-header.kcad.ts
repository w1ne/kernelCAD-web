// SPDX-License-Identifier: CC0-1.0
// Irrigation lateral header: Drip irrigation header with parallel distribution bar, end cap and repeated emitter drops. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "irrigation-lateral-header",
  license: 'CC0-1.0',
  title: "Irrigation lateral header",
  description: "Drip irrigation header with parallel distribution bar, end cap and repeated emitter drops. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b'},
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

const p = assembly("irrigation-lateral-header");
p.part("main-bar", b(0,0,580,1700,55,55).color(polymer));
p.part("front-mount", b(0,-180,0,1600,55,60).color(powderCoatedSteel));
p.part("rear-mount", b(0,180,0,1600,55,60).color(powderCoatedSteel));
p.part("drop-rail", b(0,0,130,1650,45,45).color(pvc));
p.part("end-cap", b(865,0,550,70,85,85).color(polymer));
p.part("drop-left", c(-600,0,170,95,19,10).color(pvc));
p.part("drop-mid-left", c(-200,0,170,95,19,10).color(pvc));
p.part("drop-mid-right", c(200,0,170,95,19,10).color(pvc));
p.part("drop-right", c(600,0,170,95,19,10).color(pvc));
p.part("flush-valve", c(-820,0,60,170,25,10).color(pvc));

return p.model();
