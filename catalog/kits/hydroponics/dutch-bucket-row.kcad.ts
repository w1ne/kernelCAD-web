// SPDX-License-Identifier: CC0-1.0
// Dutch bucket row: Four media buckets on a shared stand with paired feed header and drain return rail. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "dutch-bucket-row",
  license: 'CC0-1.0',
  title: "Dutch bucket row",
  description: "Four media buckets on a shared stand with paired feed header and drain return rail. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("dutch-bucket-row");
p.part("support-frame-left", b(-790,0,0,65,250,680).color(powderCoatedSteel));
p.part("support-frame-right", b(790,0,0,65,250,680).color(powderCoatedSteel));
p.part("longitudinal-rail-front", b(0,-120,610,1640,55,55).color(powderCoatedSteel));
p.part("longitudinal-rail-back", b(0,120,610,1640,55,55).color(powderCoatedSteel));
p.part("bucket-1", b(-570,0,0,340,300,520).color(polymer));
p.part("bucket-2", b(-190,0,0,340,300,520).color(polymer));
p.part("bucket-3", b(190,0,0,340,300,520).color(polymer));
p.part("bucket-4", b(570,0,0,340,300,520).color(polymer));
p.part("feed-header", b(0,-230,620,50,500,45).color(pvc));
p.part("return-header", b(0,230,90,50,500,45).color(pvc));
p.part("feed-riser", c(-820,-230,0,700,24,10).color(pvc));
p.part("return-drop", c(820,230,0,190,28,10).color(pvc));

return p.model();
