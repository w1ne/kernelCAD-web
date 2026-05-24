const s = path().moveTo(0, 0).lineTo(80, 0).lineTo(80, 40).lineTo(0, 40).close();
const blank = sheetMetal(s, { thickness: 3.175, kFactor: 0.38 });
return blank.bend({ atX: 40 }, 90, 3);
