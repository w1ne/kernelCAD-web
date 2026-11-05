// SPDX-License-Identifier: CC0-1.0
// Greenhouse tunnel bay: Compact hoop-house bay with perimeter posts, a ridge beam, front-door opening, vent curb and curved polyethylene roof. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "greenhouse-tunnel-bay",
  license: 'CC0-1.0',
  title: "Greenhouse tunnel bay",
  description: "Compact hoop-house bay with perimeter posts, a ridge beam, front-door opening, vent curb and curved polyethylene roof. Parameters: overall scale, powder-coated steel, pvc, polymer, greenhouse polyethylene; weathered and highVisibility presets.",
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
const polyethylene=param('polyethylene','#bddbd0',{label:'Greenhouse polyethylene'});
presets({
  weathered: {powderCoatedSteel:'#69766e', pvc:'#b2bcae', polymer:'#b4b5aa', polyethylene:'#a9bdb5'},
  highVisibility: {powderCoatedSteel:'#e87832', pvc:'#ead789', polymer:'#f2c84b', polyethylene:'#e0f2e9'},
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

const tunnelRoof=()=>{
  const steps=16;
  let profile=path().moveTo(-750,2250);
  for(let i=1;i<=steps;i++){
    const angle=Math.PI*i/steps;
    profile=profile.lineTo(-750+1500*i/steps,2250+700*Math.sin(angle));
  }
  for(let i=steps;i>=0;i--){
    const angle=Math.PI*i/steps;
    profile=profile.lineTo(-720+1440*i/steps,2250+640*Math.sin(angle));
  }
  return profile.close().extrude(2860).rotateX(90).translate(0,1430,0).scale(scale);
};

const p = assembly("greenhouse-tunnel-bay");
p.part("base-rail-left", b(-750,0,0,50,3000,80).color(powderCoatedSteel));
p.part("base-rail-right", b(750,0,0,50,3000,80).color(powderCoatedSteel));
p.part("front-post-left", b(-750,-1450,80,55,55,2200).color(powderCoatedSteel));
p.part("front-post-right", b(750,-1450,80,55,55,2200).color(powderCoatedSteel));
p.part("rear-post-left", b(-750,1450,80,55,55,2200).color(powderCoatedSteel));
p.part("rear-post-right", b(750,1450,80,55,55,2200).color(powderCoatedSteel));
p.part("ridge-beam", b(0,0,2950,65,3000,65).color(powderCoatedSteel));
p.part("front-door-header", b(0,-1450,2140,1500,55,60).color(pvc));
p.part("vent-curb", b(0,500,2220,1250,360,120).color(polymer));
p.part("ridge-support", c(0,0,80,2840,40,10).color(powderCoatedSteel));

p.part("polyethylene-roof",tunnelRoof().color(polyethylene));

return p.model();
