// Molded parts tray, fixed: 2° draft on every outside and inside wall (the
// outside narrows and the pocket widens toward the +z pull direction), and
// the side snap window that locked the part in the mold removed.
const SIDES = ['front', 'back', 'left', 'right'];
let outer = box(60, 40, 15);
for (const f of SIDES) outer = outer.draft(2, { face: f, neutralPlane: 'bottom', pullDir: [0, 0, 1] });
let pocket = box(56, 36, 14).translate(2, 2, 2);
for (const f of SIDES) pocket = pocket.draft(2, { face: f, neutralPlane: 'top', pullDir: [0, 0, -1] });
return outer.subtract(pocket);
