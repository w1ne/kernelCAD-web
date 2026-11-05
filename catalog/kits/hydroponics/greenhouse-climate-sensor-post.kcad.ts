// SPDX-License-Identifier: CC0-1.0
// Greenhouse climate sensor post: Freestanding sensor mast with radiation shield discs, junction box and cross-arm mount. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "greenhouse-climate-sensor-post",
  license: 'CC0-1.0',
  title: "Greenhouse climate sensor post",
  description: "Freestanding sensor mast with radiation shield discs, junction box and cross-arm mount. Parameters: overall scale, powder-coated steel, polymer; weathered and highVisibility presets.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel=param('powderCoatedSteel','#557b70',{label:'Powder-coated steel'});
const polymer=param('polymer','#ddd8c7',{label:'Polymer'});
presets({
  weathered: {powderCoatedSteel:'#69766e', polymer:'#b4b5aa'},
  highVisibility: {powderCoatedSteel:'#e87832', polymer:'#f2c84b'},
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

const p = assembly("greenhouse-climate-sensor-post");
p.part("weighted-foot", b(0,0,0,400,400,100).color(powderCoatedSteel));
p.part("junction-box", b(170,0,680,210,170,240).color(polymer));
p.part("cross-arm", b(0,0,1540,700,50,50).color(polymer));
p.part("sensor-head", b(-230,0,1530,200,180,140).color(polymer));
p.part("rain-shield-top", b(230,0,1260,280,280,28).color(polymer));
p.part("rain-shield-mid", b(230,0,1200,280,280,28).color(polymer));
p.part("rain-shield-low", b(230,0,1140,280,280,28).color(polymer));
p.part("mast", c(0,0,100,1460,35,10).color(powderCoatedSteel));
p.part("aspiration-cap", c(-230,0,1670,95,78,10).color(polymer));
p.part("cable-gland", c(170,-100,680,100,30,10).color(polymer));

return p.model();
