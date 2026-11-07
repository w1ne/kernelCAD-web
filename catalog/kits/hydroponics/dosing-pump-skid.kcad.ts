// SPDX-License-Identifier: CC0-1.0
// Dosing pump skid: Portable dosing frame with two metering heads, chemical pickup tubes and a small service panel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "dosing-pump-skid",
  license: 'CC0-1.0',
  title: "Dosing pump skid",
  description: "Portable dosing frame with two metering heads, chemical pickup tubes and a small service panel. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("dosing-pump-skid");
p.part("base-skid", b(0,0,0,960,480,90).color(powderCoatedSteel));
p.part("back-panel", b(0,210,90,900,45,840).color(polymer));
p.part("pump-shelf", b(0,0,510,850,430,50).color(polymer));
p.part("control-box", b(300,160,560,260,130,290).color(polymer));
p.part("left-pump-body", b(-230,0,560,210,230,230).color(polymer));
p.part("right-pump-body", b(80,0,560,210,230,230).color(polymer));
p.part("left-tube-rail", b(-230,-160,240,30,35,380).color(pvc));
p.part("right-tube-rail", b(80,-160,240,30,35,380).color(pvc));
p.part("left-meter-head", c(-230,0,790,130,76,10).color(powderCoatedSteel));
p.part("right-meter-head", c(80,0,790,130,76,10).color(powderCoatedSteel));
p.part("pickup-left", c(-230,-180,0,270,24,10).color(pvc));
p.part("pickup-right", c(80,-180,0,270,24,10).color(pvc));

return p.model();
