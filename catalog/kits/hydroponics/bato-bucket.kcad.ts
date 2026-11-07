// SPDX-License-Identifier: CC0-1.0
// Bato bucket: Single recirculating media bucket with a top collar, lower drain fitting and short feed tube. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bato-bucket",
  license: 'CC0-1.0',
  title: "Bato bucket",
  description: "Single recirculating media bucket with a top collar, lower drain fitting and short feed tube. Parameters: overall scale, pvc, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pvc=param('pvc','#c7d4ca',{label:'PVC'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {pvc:'#b2bcae', polymer:'#b4b5aa'},
  highVisibility: {pvc:'#ead789', polymer:'#f2c84b'},
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

const p = assembly("bato-bucket");
p.part("bucket-body", b(0,0,0,420,420,500).color(polymer));
p.part("upper-rim", b(0,0,500,470,470,65).color(polymer));
p.part("inset-lid", b(0,0,565,390,390,40).color(polymer));
p.part("front-panel", b(0,-214,140,310,28,190).color(polymer));
p.part("side-rib-left", b(-185,0,65,32,380,390).color(polymer));
p.part("side-rib-right", b(185,0,65,32,380,390).color(polymer));
p.part("drain-bulkhead", c(0,-235,90,95,42,10).color(pvc));
p.part("feed-stub", c(0,220,520,160,24,10).color(pvc));

return p.model();
