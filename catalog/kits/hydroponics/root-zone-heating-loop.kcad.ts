// SPDX-License-Identifier: CC0-1.0
// Root-zone heating loop: Compact bench loop manifold with three parallel heating runs, end headers and two service risers. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "root-zone-heating-loop",
  license: 'CC0-1.0',
  title: "Root-zone heating loop",
  description: "Compact bench loop manifold with three parallel heating runs, end headers and two service risers. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("root-zone-heating-loop");
p.part("left-header", b(-620,0,80,70,980,70).color(pvc));
p.part("right-header", b(620,0,80,70,980,70).color(pvc));
p.part("run-front", b(0,-320,80,1180,45,45).color(polymer));
p.part("run-center", b(0,0,80,1180,45,45).color(polymer));
p.part("run-back", b(0,320,80,1180,45,45).color(polymer));
p.part("support-front-left", b(-540,-380,0,90,90,80).color(powderCoatedSteel));
p.part("support-front-right", b(540,-380,0,90,90,80).color(powderCoatedSteel));
p.part("support-back-left", b(-540,380,0,90,90,80).color(powderCoatedSteel));
p.part("support-back-right", b(540,380,0,90,90,80).color(powderCoatedSteel));
p.part("inlet-riser", c(-620,-500,0,180,35,10).color(pvc));
p.part("outlet-riser", c(620,500,0,180,35,10).color(pvc));
p.part("control-valve", c(-620,-500,180,95,42,10).color(pvc));

return p.model();
