const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
return blank.bend({ atX: 50 }, 90, 3);
