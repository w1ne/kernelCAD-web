/**
 * Test file to validate generated code patterns against actual Replicad API
 * Run with: npx tsx test_replicad_behavior.ts
 */

import * as replicad from 'replicad';

async function testGeneratedCodePatterns() {
    console.log('Testing Replicad code generation patterns...\n');

    try {
        // Test 1: Basic box creation
        console.log('Test 1: Box creation');
        const box = replicad.makeBox(20, 20, 20);
        console.log('✓ Box created successfully');
        console.log(`  - Has faces: ${box.faces.length}`);

        // Test 2: Sketch on standard plane
        console.log('\nTest 2: Sketch on XZ plane');
        const sketch1 = new replicad.Sketcher('XZ')
            .movePointerTo([0, 0])
            .lineTo([10, 0])
            .lineTo([10, 10])
            .lineTo([0, 10])
            .close();
        console.log('✓ Sketch created on XZ plane');

        // Test 3: Extrude sketch
        console.log('\nTest 3: Extrude sketch');
        const extruded1 = sketch1.extrude(10);
        console.log('✓ Sketch extruded successfully');

        // Test 4: Access face from box
        console.log('\nTest 4: Access face from box');
        const face = box.faces[0];
        console.log(`✓ Face accessed: type=${face.geomType}`);

        // Test 5: Create plane from face
        console.log('\nTest 5: Create plane from face');
        const plane = replicad.makePlaneFromFace(face);
        console.log('✓ Plane created from face');

        // Test 6: Sketch on face-derived plane
        console.log('\nTest 6: Sketch on face-derived plane');
        const sketch2 = new replicad.Sketcher(plane)
            .movePointerTo([0, 0])
            .lineTo([5, 0])
            .lineTo([5, 5])
            .lineTo([0, 5])
            .close();
        console.log('✓ Sketch created on face plane');

        // Test 7: Extrude face-based sketch
        console.log('\nTest 7: Extrude face-based sketch');
        const extruded2 = sketch2.extrude(5);
        console.log('✓ Face-based sketch extruded');

        // Test 8: Test the pattern from generateSketchOnFaceCode (parametric)
        console.log('\nTest 8: Generated code pattern (parametric)');
        const box1 = replicad.makeBox(10, 10, 10);
        const face_sketch1 = box1.faces[1];
        const plane_sketch1 = replicad.makePlaneFromFace(face_sketch1);
        const sketch_test = new replicad.Sketcher(plane_sketch1)
            .movePointerTo([0, 0])
            .lineTo([3, 0])
            .lineTo([3, 3])
            .close();
        const extrude_test = sketch_test.extrude(2);
        console.log('✓ Generated parametric pattern works');

        // Test 9: Test detached sketch pattern
        console.log('\nTest 9: Generated code pattern (detached)');
        const plane_detached = new replicad.Plane([0, 0, 0], null, [0, 0, 1]);
        const sketch_detached = new replicad.Sketcher(plane_detached)
            .movePointerTo([0, 0])
            .lineTo([4, 0])
            .lineTo([4, 4])
            .close();
        const extrude_detached = sketch_detached.extrude(3);
        console.log('✓ Generated detached pattern works');

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testGeneratedCodePatterns().catch(console.error);

export { testGeneratedCodePatterns };
