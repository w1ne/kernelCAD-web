// SPDX-License-Identifier: CC0-1.0
// Coir slab holder: Open-sided slab cradle with a perforated-looking support deck and central drain line. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "coco-coir-slab-holder",
  license: 'CC0-1.0',
  title: "Coir slab holder",
  description: "Open-sided slab cradle with a perforated-looking support deck and central drain line. Parameters: overall scale, powder-coated steel, pvc, polymer; weathered and highVisibility presets.",
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

const p = assembly("coco-coir-slab-holder");
p.part("left-end", b(-760,0,0,70,460,260).color(polymer));
p.part("right-end", b(760,0,0,70,460,260).color(polymer));
p.part("front-rail", b(0,-200,100,1500,55,55).color(powderCoatedSteel));
p.part("back-rail", b(0,200,100,1500,55,55).color(powderCoatedSteel));
p.part("slab", b(0,0,170,1400,380,180).color(polymer));
p.part("deck-strip-a", b(-520,0,0,90,410,95).color(polymer));
p.part("deck-strip-b", b(0,0,0,90,410,95).color(polymer));
p.part("deck-strip-c", b(520,0,0,90,410,95).color(polymer));
p.part("irrigation-line", b(0,230,290,1400,35,35).color(pvc));
p.part("drain-line", c(0,-240,0,120,35,10).color(pvc));

return p.model();
