// SPDX-License-Identifier: CC0-1.0
// Rolling postal container: Four-wheel high-sided mail container with cage uprights, two shelves and a swing gate. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "rolling-postal-container",
  license: 'CC0-1.0',
  title: "Rolling postal container",
  description: "Four-wheel high-sided mail container with cage uprights, two shelves and a swing gate. Scale, structural steel, rubber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#6d7c7b', { label: 'Structural steel' });
const rubber = param('rubber', '#30373b', { label: 'Rubber' });
presets({
  weathered: { structuralSteel: '#67675f', rubber: '#3d3d39' },
  highVisibility: { structuralSteel: '#454f54', rubber: '#252b2e' },
});
const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);
const section = (radius:number,sides:number) => {
  let outline = path().moveTo(radius*Math.cos(Math.PI/2),radius*Math.sin(Math.PI/2));
  for (let k=1;k<sides;k++) { const angle=Math.PI/2+(2*Math.PI*k)/sides; outline=outline.lineTo(radius*Math.cos(angle),radius*Math.sin(angle)); }
  return outline.close();
};
const loftCylinder = (height:number,radius:number,sides:number) => {
  const levels=[0,height*0.07,height*0.93,height];
  const radii=[radius*0.88,radius,radius,radius*0.88];
  const profiles=levels.map((_,i)=>section(radii[i],sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z)=>({plane:'XY' as const,origin:[0,0,z] as [number,number,number]})),
    ruled:true,
  });
};
const wheelY=(x:number,y:number,z:number,w:number,d:number,h:number)=>{const radius=Math.min(w,h)*0.48;return loftCylinder(d,radius,10).rotateX(90).translate(x,y+d/2,z+radius).scale(scale);};

const p = assembly("rolling-postal-container");
p.part("base", b(0,0,140,720,520,75).color(structuralSteel));
p.part("wheel-left-front", wheelY(-300,-230,0,110,80,140).color(rubber));
p.part("wheel-right-front", wheelY(300,-230,0,110,80,140).color(rubber));
p.part("wheel-left-back", wheelY(-300,230,0,110,80,140).color(rubber));
p.part("wheel-right-back", wheelY(300,230,0,110,80,140).color(rubber));
p.part("post-left", b(-330,-230,215,38,38,1120).color(structuralSteel));
p.part("post-right", b(330,-230,215,38,38,1120).color(structuralSteel));
p.part("post-left-back", b(-330,230,215,38,38,1120).color(structuralSteel));
p.part("post-right-back", b(330,230,215,38,38,1120).color(structuralSteel));
p.part("top-front", b(0,-230,1335,680,38,38).color(structuralSteel));
p.part("top-back", b(0,230,1335,680,38,38).color(structuralSteel));
p.part("shelf", b(0,0,700,650,440,45).color(structuralSteel));
p.part("gate", b(0,-245,250,600,28,500).color(structuralSteel));

return p.model();
