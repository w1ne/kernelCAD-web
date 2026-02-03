import { generateSketchCode } from './src/lib/sketchCodegen';
import { insertShape } from './src/lib/ast';

const entities = [
    {
        id: 'e1',
        type: 'rectangle',
        corner: [0, 10] as [number, number],
        width: 10,
        height: 10
    }
];

const sketchData = {
    id: 's1',
    name: 'sketch1',
    plane: 'XY',
    entities: entities as any[],
    closed: true,
    createdAt: Date.now()
};

const sketchCode = generateSketchCode(sketchData);
console.log('Generated Sketch Code:');
console.log(sketchCode);

const initialCode = `
const { Sketcher } = replicad;
function drawPart() {
  const base = new Sketcher().hLine(40).vLine(40).hLine(-40).close().extrude(20);
  return [base];
}
return drawPart();
`;

try {
    const newCode = insertShape(initialCode, sketchCode);
    console.log('\nNew Code after insertion:');
    console.log(newCode);
} catch (e) {
    console.error('Insertion failed:', e);
}
