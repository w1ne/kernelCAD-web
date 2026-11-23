// Housing built with selectors, a point pattern, a slot, a mirrored ear and a face picked by extent.
// Verify: kernelcad evaluate examples/selection-by-extent-and-slot.kcad.ts  (OK, bbox 61 x 40 x 32 mm)
const W = 60, D = 40, H = 24, wall = 2.5;

// edges("|Z").fillet(5): the vertical edges, by direction
const block = box(W, D, H);
const rounded = block.fillet(5, await selectEdges(block, { parallel: 'Z' }));

// faces(">Z").shell(-wall): hollow, open at the top (positive wall here)
const shelled = rounded.shell(wall, { face: 'top' });

// faces("<Z").workplane().rarray(...).cboreHole(...): positions are computed, u/v from the face centre
const floorHoles = shelled.holes('bottom', {
  positions: [-20, 20].flatMap((u) => [-10, 10].map((v) => ({ u, v }))),
  diameter: 4, depth: 'through', counterbore: { diameter: 8, depth: 0.8 },
});

// faces(">Z").edges().chamfer(0.8): the edges of one face go to the operation
const rimmed = floorHoles.chamfer(0.8, { face: 'top' });

// slot2D(20, 10) cut through the floor: profile coordinates are from the face centre
const slotted = rimmed.cutout(path().slot(0, 0, { width: 6, centerDistance: 12 }), { face: 'bottom', depth: 'through' });

// extrude(both=True) then mirror("YZ"): an ear on +X reflected to -X
const ear = path().circle(0, 0, 5).extrude(3, { symmetric: true }).rotateY(90).translate(W - 1, D / 2, H / 2);
const body = slotted.union(ear).union(ear.mirror({ plane: 'yz', offset: W / 2 }));

// faces(">Z") on a stacked body: the highest upward-facing face, by extent, not by the name a union split
const boss = body.union(cylinder(30, 5).translate(12, D / 2, 2));
return boss.holes({ byNormal: 'Z', extreme: 'Z' }, { positions: [{ u: 0, v: 0 }], diameter: 3, depth: 4 });
