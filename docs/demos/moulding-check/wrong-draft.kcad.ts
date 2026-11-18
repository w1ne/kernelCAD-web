// Same enclosure base with 1.5° of draft — applied the wrong way: the walls
// lean inward toward the opening, so the shelled cavity is narrower at the
// top than at the floor and the core cannot be pulled out. Pull direction +Z.
dfmSpec({ process: 'moulding', pullDirection: '+z', minDraftDeg: 1, minWallMm: 1.2, maxWallMm: 3.5, minRadiusMm: 0.5 });

let base = box(80, 50, 25);
for (const side of ['front', 'back', 'left', 'right']) {
  base = base.draft(1.5, { face: side, pullDir: [0, 0, 1] });
}
return base.shell(2, { face: 'top' }).fillet(1, { concave: true });
