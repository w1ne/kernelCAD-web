// Pocketed cover plate used in the "Ten problems" blog post.
//
// An 80 x 50 x 12 aluminium plate with a 60 x 34 x 8 pocket. With
// pocketCornerR = 0 the pocket has four sharp vertical corners and
// dfm_review fails cnc.internal-corner-radius for a 6 mm end mill
// (R3). With R4 the corners clear the tool radius and the check passes.
const plateW = 80;
const plateD = 50;
const plateT = 12;
const pocketW = 60;
const pocketD = 34;
const pocketDepth = 8;
const pocketCornerR = 4; // > R3 of a 6 mm end mill; set 0 to reproduce the failure

let pocket = box(pocketW, pocketD, pocketDepth);
if (pocketCornerR > 0) pocket = pocket.fillet(pocketCornerR, { parallel: [0, 0, 1] });
pocket = pocket.translate((plateW - pocketW) / 2, (plateD - pocketD) / 2, plateT - pocketDepth);

return box(plateW, plateD, plateT).subtract(pocket);
