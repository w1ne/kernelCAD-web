// The original failing bend radius was 1.0 mm; the per-material minimum
// for laser-cut + bending 6061 0.125 in is 0.094 in = 2.388 mm.
// Repair: enlarge to 3 mm to be safely above the threshold.
const s = path().moveTo(0, 0).lineTo(60, 0).lineTo(60, 30).lineTo(0, 30).close();
const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
return blank.bend({ atX: 30 }, 90, 3);
