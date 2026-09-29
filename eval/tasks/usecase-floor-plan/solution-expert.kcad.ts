// U8 - Floor plan: 10 ft x 12 ft bedroom, 4 in walls, 32 in door, 48 in window,
// queen bed, wardrobe. All dimensions in mm (kernelCAD default unit).
const roomWidth = param('roomWidth', 3048, { description: 'exterior width, 10 ft' });
const roomDepth = param('roomDepth', 3657.6, { description: 'exterior depth, 12 ft' });
const wallThickness = param('wallThickness', 101.6, { description: 'wall thickness, 4 in' });
const wallHeight = param('wallHeight', 2438.4, { description: 'wall height, 8 ft (assumed ceiling height, not stated)' });
const doorWidth = param('doorWidth', 812.8, { description: 'door opening width, 32 in' });
const windowWidth = param('windowWidth', 1219.2, { description: 'window opening width, 48 in' });
const windowHeight = param('windowHeight', 1200, { description: 'window opening height (assumed, not stated)' });
const windowSill = param('windowSill', 750, { description: 'window sill height AFF (assumed, not stated)' });
const bedWidth = param('bedWidth', 1524, { description: 'queen bed width, 60 in (standard queen)' });
const bedLength = param('bedLength', 2032, { description: 'queen bed length, 80 in (standard queen)' });
const bedHeight = param('bedHeight', 500, { description: 'bed height, assumed' });
const wardrobeWidth = param('wardrobeWidth', 1219.2, { description: 'wardrobe width along wall, assumed 48 in' });
const wardrobeDepth = param('wardrobeDepth', 609.6, { description: 'wardrobe depth, assumed 24 in' });
const wardrobeHeight = param('wardrobeHeight', 1800, { description: 'wardrobe height, assumed' });

const interiorWidth = roomWidth.subtract(wallThickness.multiply(2));
const interiorDepth = roomDepth.subtract(wallThickness.multiply(2));

let outer = box(roomWidth, roomDepth, wallHeight);
let inner = box(interiorWidth, interiorDepth, wallHeight.add(2)).translate(wallThickness, wallThickness, -1);
let walls = outer.subtract(inner);

const doorOffset = 300; // south wall, offset from SW corner
let doorCut = box(doorWidth, wallThickness.add(2), wallHeight.add(2)).translate(doorOffset, -1, -1);
walls = walls.subtract(doorCut);

const windowOffset = roomWidth.subtract(windowWidth).divide(2); // centered on north wall
let windowCut = box(windowWidth, wallThickness.add(2), windowHeight).translate(windowOffset, roomDepth.subtract(wallThickness).subtract(1), windowSill);
walls = walls.subtract(windowCut);

// Queen bed, headboard against north wall (below the window)
const bedX = wallThickness.add(interiorWidth.subtract(bedWidth).divide(2));
const bedY = roomDepth.subtract(wallThickness).subtract(bedLength);
let bed = box(bedWidth, bedLength, bedHeight).translate(bedX, bedY, 0);

// Wardrobe against west wall, away from the door swing
const wardrobeX = wallThickness;
const wardrobeY = 2200;
let wardrobe = box(wardrobeDepth, wardrobeWidth, wardrobeHeight).translate(wardrobeX, wardrobeY, 0);

let plan = union(walls, bed, wardrobe);
return plan;
