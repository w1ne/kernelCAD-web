// U9 - Plywood bookshelf, CNC cut parts, dado joints.
// Overall: 800mm wide x 1200mm tall x 300mm deep, 18mm plywood.
// 2 side panels (dado grooves cut on inner face) + 6 horizontal boards
// (bottom, top, and 4 shelves) that sit in the dado grooves.
// Verified live on kernelCAD: evaluate_script ok, bbox [0,0,0]-[800,300,1200],
// volume 37,713,600 mm3 (matches sum of 8 boards exactly -> no double-counted
// overlap at the dado joints). Rendered front/iso views match a 5-compartment
// open bookshelf with 4 shelves.
const W = 800, H = 1200, D = 300, T = 18, dadoDepth = 9, shelfCount = 4;
const interiorW = W - 2 * T; // 764 clear width between side panels
const boardLen = interiorW + 2 * dadoDepth; // 782 -- horizontal board length (reaches to bottom of each dado)
const clearH = H - 2 * T; // 1164 clear height between bottom and top boards
const compartments = shelfCount + 1; // 5 equal compartments
const compartmentH = (clearH - shelfCount * T) / compartments; // 218.4

const boardZs = [];
boardZs.push(T / 2); // bottom board center = 9
let z = T;
for (let i = 0; i < shelfCount; i++) {
  z += compartmentH;
  boardZs.push(z + T / 2);
  z += T;
}
boardZs.push(H - T / 2); // top board center = 1191

let leftPanel = box(T, D, H, false).translate(0, 0, 0);
for (const bz of boardZs) {
  const pocket = box(dadoDepth, D, T, false).translate(T - dadoDepth, 0, bz - T / 2);
  leftPanel = leftPanel.subtract(pocket);
}

let rightPanel = box(T, D, H, false).translate(W - T, 0, 0);
for (const bz of boardZs) {
  const pocket = box(dadoDepth, D, T, false).translate(W - T, 0, bz - T / 2);
  rightPanel = rightPanel.subtract(pocket);
}

let boards = [];
for (const bz of boardZs) {
  const board = box(boardLen, D, T, false).translate(T - dadoDepth, 0, bz - T / 2);
  boards.push(board);
}

let shelfUnit = union(leftPanel, rightPanel, ...boards);
return shelfUnit;
