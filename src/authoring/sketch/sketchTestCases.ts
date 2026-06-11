// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Proof of Concept: Test Replicad Sketcher API
// Replace the default code temporarily to test different sketch patterns

export const sketchTest1_Rectangle = `
// Test 1: Rectangle sketch with extrude
const { Sketcher } = replicad;

function drawPart() {
  const rect = new Sketcher('XY')
    .movePointerTo([0, 0])
    .lineTo([20, 0])
    .lineTo([20, 10])
    .lineTo([0, 10])
    .close()
    .extrude(5);
    
  return [rect];
}

return drawPart();
`;

export const sketchTest2_Circle = `
// Test 2: Circle sketch (if available)
const { Sketcher, sketchCircle } = replicad;

function drawPart() {
  // Try using sketchCircle helper
  try {
    const circle = sketchCircle(10).extrude(5);
    return [circle];
  } catch (e) {
    // Fallback: manual circle with arc
    console.log('sketchCircle not available:', e);
    
    // Try basic sketch
    const fallback = new Sketcher('XY')
      .hLine(10)
      .vLine(10)
      .hLine(-10)
      .close()
      .extrude(5);
    
    return [fallback];
  }
}

return drawPart();
`;

export const sketchTest3_MultipleSketches = `
// Test 3: Multiple sketches in different planes
const { Sketcher } = replicad;

function drawPart() {
  // Sketch on XY plane
  const base = new Sketcher('XY')
    .movePointerTo([0, 0])
    .lineTo([15, 0])
    .lineTo([15, 15])
    .lineTo([0, 15])
    .close()
    .extrude(3);
    
  // Sketch on XZ plane  
  const side = new Sketcher('XZ')
    .movePointerTo([0, 0])
    .lineTo([5, 0])
    .lineTo([5, 5])
    .lineTo([0, 5])
    .close()
    .extrude(3)
    .translate(20, 0, 0);  // Move it aside
    
  return [base, side];
}

return drawPart();
`;

export const sketchTest4_NoPlane = `
// Test 4: Sketch without specifying plane (should default to XY)
const { Sketcher } = replicad;

function drawPart() {
  const noPlane = new Sketcher()  // No plane specified
    .hLine(12)
    .vLine(8)
    .hLine(-12)
    .close()
    .extrude(4);
    
  return [noPlane];
}

return drawPart();
`;

export const sketchTest5_ExistingCode = `
// Test 5: Verify existing default code still works
const { Sketcher } = replicad;

function drawPart() {
  const base = new Sketcher()
    .hLine(40)
    .vLine(40)
    .hLine(-40)
    .close()
    .extrude(20);

  const filleted = base.fillet(2);
  const cyl = replicad.makeCylinder(10, 30).translate(0, 0, 10);
  
  return [filleted.cut(cyl)];
}

return drawPart();
`;
