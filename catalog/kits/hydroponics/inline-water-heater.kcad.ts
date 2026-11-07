// SPDX-License-Identifier: CC0-1.0
// Inline water heater: Vertical inline heater housing with insulated jacket, access panel and inlet/outlet unions. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "inline-water-heater",
  license: 'CC0-1.0',
  title: "Inline water heater",
  description: "Vertical inline heater housing with insulated jacket, access panel and inlet/outlet unions. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("inline-water-heater");
p.part("support-base", b(0,0,0,550,500,70).color(powderCoatedSteel));
p.part("front-panel", b(0,-270,260,350,30,520).color(polymer));
p.part("insulation-band", b(0,0,450,500,510,75).color(polymer));
p.part("junction-box", b(220,-170,630,170,150,170).color(polymer));
p.part("top-cap", b(0,0,820,510,510,70).color(polymer));
p.part("heater-body", c(0,0,70,800,220,10).color(polymer));
p.part("inlet-union", c(0,-80,0,230,40,10).color(pvc));
p.part("outlet-union", c(0,-80,820,230,40,10).color(pvc));
p.part("status-post", c(-190,-160,700,130,25,10).color(powderCoatedSteel));

return p.model();
