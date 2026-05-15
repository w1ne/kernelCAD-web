// Ambient declaration for the `isosurface` npm package (no @types package
// exists; the lib is pure JS). Slice-1 only consumes `surfaceNets`.
declare module 'isosurface' {
  export function surfaceNets(
    dims: [number, number, number],
    potential: (x: number, y: number, z: number) => number,
    bounds: [[number, number, number], [number, number, number]],
  ): { positions: number[][]; cells: number[][] };
  export function marchingCubes(
    dims: [number, number, number],
    potential: (x: number, y: number, z: number) => number,
    bounds: [[number, number, number], [number, number, number]],
  ): { positions: number[][]; cells: number[][] };
  export function marchingTetrahedra(
    dims: [number, number, number],
    potential: (x: number, y: number, z: number) => number,
    bounds: [[number, number, number], [number, number, number]],
  ): { positions: number[][]; cells: number[][] };
  const _default: {
    surfaceNets: typeof surfaceNets;
    marchingCubes: typeof marchingCubes;
    marchingTetrahedra: typeof marchingTetrahedra;
  };
  export default _default;
}
