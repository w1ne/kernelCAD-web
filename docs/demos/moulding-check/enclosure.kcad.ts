// Injection-moulded enclosure base, 80 x 50 x 25 mm, 2 mm wall, opening up
// (+Z is the mould pull; the core comes out of the top). 1.5° of draft flares
// both skins outward toward the opening, and a 1 mm concave fillet (half the
// wall) rounds every inside corner. Same as the cookbook snippet
// injection-moulding-draft-and-walls.
dfmSpec({ process: 'moulding', pullDirection: '+z', minDraftDeg: 1, minWallMm: 1.2, maxWallMm: 3.5, minRadiusMm: 0.5 });

let base = box(80, 50, 25);
for (const side of ['front', 'back', 'left', 'right']) {
  base = base.draft(-1.5, { face: side, pullDir: [0, 0, 1] });
}
return base.shell(2, { face: 'top' }).fillet(1, { concave: true });
