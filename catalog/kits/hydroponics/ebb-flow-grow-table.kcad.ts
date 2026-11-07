// SPDX-License-Identifier: CC0-1.0
// Ebb-and-flow grow table: Flood-and-drain bench with a shallow growing tray, underframe, overflow standpipe and return outlet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ebb-flow-grow-table",
  license: 'CC0-1.0',
  title: "Ebb-and-flow grow table",
  description: "Flood-and-drain bench with a shallow growing tray, underframe, overflow standpipe and return outlet. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("ebb-flow-grow-table");
p.part("tray-floor", b(0,0,780,1800,1050,80).color(polymer));
p.part("front-lip", b(0,-520,860,1800,55,110).color(polymer));
p.part("back-lip", b(0,520,860,1800,55,110).color(polymer));
p.part("left-lip", b(-872,0,860,55,1000,110).color(polymer));
p.part("right-lip", b(872,0,860,55,1000,110).color(polymer));
p.part("leg-left-front", b(-780,-430,0,55,55,780).color(powderCoatedSteel));
p.part("leg-right-front", b(780,-430,0,55,55,780).color(powderCoatedSteel));
p.part("leg-left-back", b(-780,430,0,55,55,780).color(powderCoatedSteel));
p.part("leg-right-back", b(780,430,0,55,55,780).color(powderCoatedSteel));
p.part("lower-brace", b(0,0,280,1550,55,50).color(powderCoatedSteel));
p.part("overflow-standpipe", c(600,300,610,170,25,10).color(pvc));
p.part("return-outlet", c(-700,-500,600,180,32,10).color(pvc));

return p.model();
