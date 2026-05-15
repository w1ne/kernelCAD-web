// The flat-pattern roundtrip is exercised by the harness via the
// `flatten_pattern` MCP tool, which lowers the Shape (populating the
// bendRecord metadata) before walking back to the sheetMetal root.
// The .kcad.ts script just builds the bent body.
const s = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 60).lineTo(0, 60).close();
const blank = sheetMetal(s, { thickness: 2, kFactor: 0.38 });
return blank.bend({ atX: 50 }, 90, 3);
