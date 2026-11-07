// SPDX-License-Identifier: CC0-1.0
// Solution mixing tank: Vertical mixing vessel with top motor bridge, short agitator shaft and side sampling ports. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "solution-mixing-tank",
  license: 'CC0-1.0',
  title: "Solution mixing tank",
  description: "Vertical mixing vessel with top motor bridge, short agitator shaft and side sampling ports. Parameters: overall scale, powder-coated steel, stainless steel, pvc, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const stainlessSteel=param('stainlessSteel','#b2c0bf',{label:'Stainless steel'});
const pvc=param('pvc','#c7d4ca',{label:'PVC'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {powderCoatedSteel:'#69766e', stainlessSteel:'#929e9c', pvc:'#b2bcae', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', stainlessSteel:'#d6dfdc', pvc:'#ead789', polymer:'#f2c84b'},
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

const p = assembly("solution-mixing-tank");
p.part("tank-body", b(0,0,0,1000,1000,1300).color(polymer));
p.part("top-rim", b(0,0,1300,1040,1040,75).color(polymer));
p.part("motor-bridge", b(0,0,1375,700,100,90).color(powderCoatedSteel));
p.part("motor-cover", b(0,0,1465,300,300,210).color(powderCoatedSteel));
p.part("service-panel", b(0,-505,320,550,28,420).color(polymer));
p.part("leg-front", b(0,-360,0,900,70,110).color(powderCoatedSteel));
p.part("agitator-shaft", c(0,0,180,1130,32,10).color(stainlessSteel));
p.part("agitator-blade", c(0,0,530,110,220,10).color(polymer));
p.part("sampling-port", c(0,-540,410,170,32,10).color(polymer));
p.part("drain-outlet", c(360,-530,70,150,35,10).color(pvc));

return p.model();
