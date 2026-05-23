const s = path().moveTo(0, 0).lineTo(50, 0).lineTo(50, 25).lineTo(0, 25).close();
const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
return blank.bend({ atX: 25 }, 90, 3);
