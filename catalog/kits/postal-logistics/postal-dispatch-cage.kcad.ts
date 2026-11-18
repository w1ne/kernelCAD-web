// SPDX-License-Identifier: CC0-1.0
// Postal dispatch cage: Pallet-base dispatch cage with corner uprights, tie bars and a fitted top rail. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-dispatch-cage",
  license: 'CC0-1.0',
  title: "Postal dispatch cage",
  description: "Pallet-base dispatch cage with corner uprights, tie bars and a fitted top rail. Scale, timber, structural steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const timber = param('timber', '#6b7977', { label: 'Timber' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
presets({
  weathered: { timber: '#71614b', structuralSteel: '#67675f' },
  highVisibility: { timber: '#a27e44', structuralSteel: '#454f54' },
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

const p = assembly("postal-dispatch-cage");
p.part("pallet-base", b(0,0,0,1100,900,150).color(timber));
p.part("skid-a", b(-350,0,0,100,850,85).color(timber));
p.part("skid-b", b(0,0,0,100,850,85).color(timber));
p.part("skid-c", b(350,0,0,100,850,85).color(timber));
p.part("post-left-front", b(-520,-420,150,45,45,1300).color(structuralSteel));
p.part("post-right-front", b(520,-420,150,45,45,1300).color(structuralSteel));
p.part("post-left-back", b(-520,420,150,45,45,1300).color(structuralSteel));
p.part("post-right-back", b(520,420,150,45,45,1300).color(structuralSteel));
p.part("top-front", b(0,-420,1450,1080,45,45).color(timber));
p.part("top-back", b(0,420,1450,1080,45,45).color(timber));
p.part("top-left", b(-520,0,1450,45,840,45).color(timber));
p.part("top-right", b(520,0,1450,45,840,45).color(timber));
p.part("mid-rail", b(0,-420,700,1080,35,35).color(structuralSteel));

return p.model();
