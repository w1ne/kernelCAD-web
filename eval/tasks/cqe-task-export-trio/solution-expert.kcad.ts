// eval/tasks/cqe-task-export-trio/solution-expert.kcad.ts
//
// Reference solution for cqe-task-export-trio. Two named parts under a single
// assembly: a 50 x 30 x 1.5 sheet-metal plate and a 20 x 10 x 5 solid bracket
// resting on top. The harness runs the returned Scene through every multi-
// body export writer (STL / 3MF / GLB) and reconstructs the plate-only flat
// pattern inline for the DXF gate.

const plateProfile = path()
  .moveTo(0, 0)
  .lineTo(50, 0)
  .lineTo(50, 30)
  .lineTo(0, 30)
  .close();

const plate = sheetMetal(plateProfile, { thickness: 1.5, kFactor: 0.4 }).color('plate');

const bracket = box(20, 10, 5).translate(15, 10, 1.5).color('frame');

const asm = assembly('export-trio');
asm.part('plate', plate);
asm.part('bracket', bracket);

return asm.model();
