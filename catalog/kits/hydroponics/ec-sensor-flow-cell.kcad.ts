// SPDX-License-Identifier: CC0-1.0
// EC sensor flow cell: Inline conductivity cell with paired unions, removable electrode cap and support feet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "ec-sensor-flow-cell",
  license: 'CC0-1.0',
  title: "EC sensor flow cell",
  description: "Inline conductivity cell with paired unions, removable electrode cap and support feet. Parameters: overall scale, powder-coated steel, stainless steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("ec-sensor-flow-cell");
p.part("base-plate", b(0,0,0,520,300,50).color(powderCoatedSteel));
p.part("support-left", b(-175,0,50,55,55,190).color(powderCoatedSteel));
p.part("support-right", b(175,0,50,55,55,190).color(powderCoatedSteel));
p.part("sensor-block", b(0,0,240,300,270,210).color(polymer));
p.part("cable-box", b(0,160,450,180,100,120).color(polymer));
p.part("left-union", b(-325,0,255,230,75,75).color(pvc));
p.part("right-union", b(325,0,255,230,75,75).color(pvc));
p.part("flow-body", c(0,0,120,300,112,10).color(polymer));
p.part("electrode-cap", c(0,0,420,90,70,10).color(stainlessSteel));
p.part("probe-tip", c(0,0,510,240,22,10).color(stainlessSteel));

return p.model();
