// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

export type WireVec3 = [number, number, number];
export interface WireObstacle { id: string; min_mm: WireVec3; max_mm: WireVec3 }
interface Endpoint { ref?: string; pin?: string; pos_mm?: [number, number] | WireVec3 | null }
interface HandoffWire { id?: string; net?: string; from?: Endpoint; to?: Endpoint; color?: string | { value?: string }; gauge_awg?: { value?: number } }
interface Part { ref: string; position_mm?: { value?: [number, number] | [number, number, number] | null }; rotation_deg?: { value?: number | [number, number, number] | null }; pins?: Array<{ name: string; pad?: string; pos_mm?: [number, number] | WireVec3 | null }>; physical?: { bbox_mm?: [number, number, number] | null } }
interface LabWiredHandoff { schema: 'labwired-kernelcad-handoff/0.1'; parts: Part[]; wires: HandoffWire[] }
export interface WireRouteInput {
  wires?: Array<{ id?: string; from?: string | Endpoint; to?: string | Endpoint; from_pos_mm?: WireVec3 | null; to_pos_mm?: WireVec3 | null; color?: string; diameter_mm?: number; clearance_ambiguous?: boolean }>;
  handoff?: LabWiredHandoff;
  obstacles?: WireObstacle[];
  /** Z coordinate assigned to 2D handoff board-frame endpoints. Without it, clearance is inconclusive. */
  board_surface_z_mm?: number;
  clearance_mm?: number;
  bend_radius_mm?: number;
}

interface NormalizedWire { id?: string; from?: string | Endpoint; to?: string | Endpoint; from_pos_mm?: WireVec3 | null; to_pos_mm?: WireVec3 | null; color?: string; diameter_mm?: number; clearance_ambiguous?: boolean }
interface WireRouteResult { id: string; from?: string | Endpoint; to?: string | Endpoint; color: string; diameter_mm: number; points_mm: WireVec3[]; length_mm: number | null; bend_count: number | null; requested_bend_radius_mm: number; collisions: string[]; clearance_violations: string[]; route_found: boolean; route_failure?: string }

/** Computes orthogonal pin route estimates and checks swept clearance to AABBs. */
export function routeWires(input: WireRouteInput) {
  const options = readRouteOptions(input);
  const warnings: string[] = [];
  const handoffObstacleResult = input.handoff ? obstaclesFromHandoff(input.handoff, options.boardSurfaceZ) : { obstacles: [], warnings: [] };
  warnings.push(...handoffObstacleResult.warnings);
  const obstacles = [...handoffObstacleResult.obstacles, ...(input.obstacles ?? [])];
  validateObstacles(obstacles);
  if (!input.wires && !input.handoff) throw new Error('Provide wires or a LabWired handoff.');
  const wires = collectWires(input, options.boardSurfaceZ);
  const routes = routeAllWires(wires, obstacles, options, warnings);
  return makeRouteReport(routes, warnings, obstacles.length, options);
}

interface RouteOptions { clearance: number; radius: number; boardSurfaceZ?: number }
function readRouteOptions(input: WireRouteInput): RouteOptions {
  const clearance = input.clearance_mm ?? 1;
  const radius = input.bend_radius_mm ?? 2;
  if (!Number.isFinite(clearance) || clearance < 0) throw new Error('clearance_mm must be a finite non-negative number.');
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('bend_radius_mm must be a finite positive number.');
  if (input.board_surface_z_mm !== undefined && !Number.isFinite(input.board_surface_z_mm)) throw new Error('board_surface_z_mm must be finite.');
  return { clearance, radius, boardSurfaceZ: input.board_surface_z_mm };
}
function collectWires(input: WireRouteInput, boardSurfaceZ?: number): NormalizedWire[] {
  // Explicit wires are the caller's selected route list; a handoff may still
  // provide part obstacles, but its wires must not be routed a second time.
  return input.wires ?? (input.handoff ? handoffWires(input.handoff, boardSurfaceZ) : []);
}
function routeAllWires(wires: NormalizedWire[], obstacles: WireObstacle[], options: RouteOptions, warnings: string[]): WireRouteResult[] {
  const routes: WireRouteResult[] = [];
  for (let index = 0; index < wires.length; index++) {
    const route = routeOneWire(wires[index], index, obstacles, options, warnings);
    if (route) routes.push(route);
  }
  return routes;
}
function routeOneWire(wire: NormalizedWire, index: number, obstacles: WireObstacle[], options: RouteOptions, warnings: string[]): WireRouteResult | undefined {
  const id = wire.id ?? `wire-${index + 1}`;
  if (wire.clearance_ambiguous) warnings.push(`Wire ${id} uses 2D handoff endpoints without board_surface_z_mm; clearance analysis is incomplete.`);
  if (!validPoint(wire.from_pos_mm) || !validPoint(wire.to_pos_mm)) {
    warnings.push(`Wire ${id} (${endpointLabel(wire.from)} → ${endpointLabel(wire.to)}) has no endpoint positions; route omitted.`);
    return undefined;
  }
  const diameter = wire.diameter_mm ?? 0.8;
  if (!Number.isFinite(diameter) || diameter <= 0) throw new Error(`Wire ${id}: diameter_mm must be finite and positive.`);
  const routeObstacles = obstacles;
  const inflated = routeObstacles.map(obstacle => inflateObstacle(obstacle, options.clearance + diameter / 2));
  const endpointOwners = new Set([endpointOwner(wire.from), endpointOwner(wire.to)].filter((ref): ref is string => ref !== undefined));
  const blocked = findBlockedEndpoint(wire.from_pos_mm, wire.to_pos_mm, inflated.filter(obstacle => !endpointOwners.has(obstacle.id)));
  if (blocked) return failedWireRoute(wire, id, diameter, options.radius, warnings, `endpoint lies within the clearance envelope of obstacle ${blocked.id}`, endpointCollisionIds(wire.from_pos_mm, wire.to_pos_mm, routeObstacles), [blocked.id]);
  const start = wire.from_pos_mm as WireVec3;
  const end = wire.to_pos_mm as WireVec3;
  const path = chooseOrthogonalPath(start, end, inflated, endpointOwners);
  if (!path.points) return failedWireRoute(wire, id, diameter, options.radius, warnings, path.failure ?? 'no route was found', [], []);
  return successfulWireRoute(wire, id, diameter, options.radius, path.points, routeObstacles, inflated, endpointOwners, start, end);
}
function endpointOwner(endpoint: string | Endpoint | undefined): string | undefined {
  return typeof endpoint === 'object' && endpoint !== null ? endpoint.ref : undefined;
}
function findBlockedEndpoint(start: WireVec3, end: WireVec3, obstacles: WireObstacle[]): WireObstacle | undefined {
  return obstacles.find(obstacle => pointInAabb(start, obstacle.min_mm, obstacle.max_mm) || pointInAabb(end, obstacle.min_mm, obstacle.max_mm));
}
function failedWireRoute(wire: NormalizedWire, id: string, diameter: number, radius: number, warnings: string[], failure: string, collisions: string[], clearanceViolations: string[]): WireRouteResult {
  warnings.push(`Wire ${id} route failed: ${failure}.`);
  return { id, from: wire.from, to: wire.to, color: wire.color ?? '#d97706', diameter_mm: diameter, points_mm: [], length_mm: null, bend_count: null, requested_bend_radius_mm: radius, collisions, clearance_violations: clearanceViolations, route_found: false, route_failure: failure };
}
function successfulWireRoute(wire: NormalizedWire, id: string, diameter: number, radius: number, points: WireVec3[], obstacles: WireObstacle[], clearanceEnvelope: WireObstacle[], endpointOwners: Set<string>, start: WireVec3, end: WireVec3): WireRouteResult {
  const collisions = obstacles.filter(obstacle => pathIntersectsObstacle(points, obstacle, endpointOwners, start, end)).map(obstacle => obstacle.id);
  const clearanceViolations = clearanceEnvelope.filter(obstacle => pathIntersectsObstacle(points, obstacle, endpointOwners, start, end)).map(obstacle => obstacle.id);
  return { id, from: wire.from, to: wire.to, color: wire.color ?? '#d97706', diameter_mm: diameter, points_mm: points, length_mm: polylineLength(points), bend_count: countBends(points), requested_bend_radius_mm: radius, collisions, clearance_violations: clearanceViolations, route_found: true };
}
function pathIntersectsObstacle(points: WireVec3[], obstacle: WireObstacle, endpointOwners = new Set<string>(), start?: WireVec3, end?: WireVec3): boolean {
  return points.some((point, index) => {
    if (index === 0) return false;
    const from = points[index - 1];
    if (start !== undefined && end !== undefined && endpointOwnerAccess(from, point, obstacle, start, end, endpointOwners)) return false;
    return segmentIntersectsAabb(from, point, obstacle.min_mm, obstacle.max_mm);
  });
}
function endpointCollisionIds(start: WireVec3, end: WireVec3, obstacles: WireObstacle[]): string[] {
  return obstacles.filter(obstacle => pointInAabb(start, obstacle.min_mm, obstacle.max_mm) || pointInAabb(end, obstacle.min_mm, obstacle.max_mm)).map(obstacle => obstacle.id);
}
function makeRouteReport(routes: WireRouteResult[], warnings: string[], obstacleCount: number, options: RouteOptions) {
  return { ok: routes.every(route => route.route_found && route.collisions.length === 0 && route.clearance_violations.length === 0) && warnings.length === 0, routes, warnings, unresolved_wire_count: warnings.filter(warning => warning.includes('no endpoint positions')).length, clearance_mm: options.clearance, requested_bend_radius_mm: options.radius, obstacles_used: obstacleCount };
}

function handoffWires(handoff: LabWiredHandoff, boardSurfaceZ?: number): NormalizedWire[] {
  if (handoff.schema !== 'labwired-kernelcad-handoff/0.1' || !Array.isArray(handoff.parts) || !Array.isArray(handoff.wires)) throw new Error('Unsupported LabWired handoff; expected schema labwired-kernelcad-handoff/0.1 with parts and wires.');
  const pinMap = new Map<string, [number, number] | WireVec3>();
  for (const part of handoff.parts) for (const pin of part.pins ?? []) {
    if (pin.pos_mm !== undefined && pin.pos_mm !== null && !validPoint2(pin.pos_mm)) throw new Error(`Pin ${part.ref}.${pin.name} pos_mm must contain exactly 2 or 3 finite coordinates.`);
    if (!validPoint2(pin.pos_mm)) continue;
    pinMap.set(`${part.ref}.${pin.name}`, pin.pos_mm);
  }
  return handoff.wires.map((wire, index) => normalizeHandoffWire(wire, index, pinMap, boardSurfaceZ));
}
function normalizeHandoffWire(wire: HandoffWire, index: number, pinMap: Map<string, [number, number] | WireVec3>, boardSurfaceZ?: number): NormalizedWire {
  const fromPosition = endpointPosition(wire.from, pinMap);
  const toPosition = endpointPosition(wire.to, pinMap);
  const color = typeof wire.color === 'string' ? wire.color : wire.color?.value;
  return {
    id: `handoff-wire-${index + 1}`, from: wire.from, to: wire.to,
    from_pos_mm: fromPosition ? asVec3(fromPosition, boardSurfaceZ ?? 0) : null,
    to_pos_mm: toPosition ? asVec3(toPosition, boardSurfaceZ ?? 0) : null,
    color, diameter_mm: wire.gauge_awg?.value ? awgToDiameter(wire.gauge_awg.value) : undefined,
    clearance_ambiguous: hasTwoDimensionalEndpoint(wire, fromPosition, toPosition) && boardSurfaceZ === undefined,
  };
}
function endpointPosition(endpoint: Endpoint | undefined, pinMap: Map<string, [number, number] | WireVec3>): [number, number] | WireVec3 | undefined {
  if (endpoint?.pos_mm !== undefined && endpoint.pos_mm !== null && !validPoint2(endpoint.pos_mm)) throw new Error('Handoff endpoint pos_mm must contain exactly 2 or 3 finite coordinates.');
  if (validPoint2(endpoint?.pos_mm)) return endpoint.pos_mm;
  if (!endpoint?.ref || !endpoint.pin) return undefined;
  return pinMap.get(`${endpoint.ref}.${endpoint.pin}`);
}
function hasTwoDimensionalEndpoint(wire: HandoffWire, from: [number, number] | WireVec3 | undefined, to: [number, number] | WireVec3 | undefined): boolean {
  return Boolean(from && !validPoint(wire.from?.pos_mm) || to && !validPoint(wire.to?.pos_mm));
}

function obstaclesFromHandoff(handoff: LabWiredHandoff, boardSurfaceZ?: number): { obstacles: WireObstacle[]; warnings: string[] } {
  if (handoff.schema !== 'labwired-kernelcad-handoff/0.1' || !Array.isArray(handoff.parts)) throw new Error('Unsupported LabWired handoff; expected schema labwired-kernelcad-handoff/0.1.');
  const warnings: string[] = [];
  const obstacles: WireObstacle[] = [];
  for (const part of handoff.parts) {
    const obstacle = obstacleFromPart(part, boardSurfaceZ, warnings);
    if (obstacle) obstacles.push(obstacle);
  }
  return { obstacles, warnings };
}
function obstacleFromPart(part: Part, boardSurfaceZ: number | undefined, warnings: string[]): WireObstacle | undefined {
  const size = part.physical?.bbox_mm;
  const pos = part.position_mm?.value;
  const rotation = rotationToEuler(part.rotation_deg?.value);
  const is3dPlacement = validPoint(pos);
  if (!size || !validPoint2(pos) || size.length !== 3 || !size.every(value => Number.isFinite(value) && value >= 0) || !rotation || (!is3dPlacement && boardSurfaceZ === undefined)) {
    warnings.push(`Part ${part.ref} has unknown or unsupported placement/bounds; clearance analysis is incomplete.`);
    return undefined;
  }
  return makePartObstacle(part.ref, size, pos, rotation, is3dPlacement, boardSurfaceZ);
}
function makePartObstacle(ref: string, size: WireVec3, pos: [number, number] | WireVec3, rotation: Euler, is3d: boolean, boardSurfaceZ?: number): WireObstacle {
  const position = is3d ? pos as WireVec3 : [pos[0], pos[1], boardSurfaceZ!] as WireVec3;
  const half = size.map(value => value / 2) as WireVec3;
  const zBounds = is3d ? [-half[2], half[2]] : [0, size[2]];
  const corners: WireVec3[] = [];
  for (const x of [-half[0], half[0]]) for (const y of [-half[1], half[1]]) for (const z of zBounds) corners.push(transformPoint([x, y, z], position, rotation));
  const placedCorners = is3d ? corners : restOnBoardSurface(corners, boardSurfaceZ!);
  return { id: ref, min_mm: boundsForAxis(placedCorners, Math.min), max_mm: boundsForAxis(placedCorners, Math.max) };
}
function restOnBoardSurface(corners: WireVec3[], boardSurfaceZ: number): WireVec3[] {
  const lowestZ = Math.min(...corners.map(point => point[2]));
  const lift = boardSurfaceZ - lowestZ;
  return corners.map(point => [point[0], point[1], point[2] + lift]);
}
function boundsForAxis(points: WireVec3[], select: (...values: number[]) => number): WireVec3 {
  return [0, 1, 2].map(axis => select(...points.map(point => point[axis]))) as WireVec3;
}

type Euler = [number, number, number];
function rotationToEuler(value: number | Euler | null | undefined): Euler | null {
  if (value === null || value === undefined) return [0, 0, 0];
  if (typeof value === 'number') return [0, 0, value];
  return value.length === 3 && value.every(Number.isFinite) ? value : null;
}
function transformPoint(point: WireVec3, position: WireVec3, rotation: Euler): WireVec3 {
  const [rx, ry, rz] = rotation.map(degrees => degrees * Math.PI / 180);
  const [x0, y0, z0] = point;
  const x1 = x0;
  const y1 = y0 * Math.cos(rx) - z0 * Math.sin(rx);
  const z1 = y0 * Math.sin(rx) + z0 * Math.cos(rx);
  const x2 = x1 * Math.cos(ry) + z1 * Math.sin(ry);
  const y2 = y1;
  const z2 = -x1 * Math.sin(ry) + z1 * Math.cos(ry);
  return [position[0] + x2 * Math.cos(rz) - y2 * Math.sin(rz), position[1] + x2 * Math.sin(rz) + y2 * Math.cos(rz), position[2] + z2];
}

function awgToDiameter(gauge: number): number { return 0.127 * 92 ** ((36 - gauge) / 39); }
function endpointLabel(endpoint: string | Endpoint | undefined): string { return typeof endpoint === 'string' ? endpoint : endpoint?.ref && endpoint.pin ? `${endpoint.ref}.${endpoint.pin}` : '?'; }
function validPoint2(p: unknown): p is [number, number] | WireVec3 { return Array.isArray(p) && (p.length === 2 || p.length === 3) && p.every(v => typeof v === 'number' && Number.isFinite(v)); }
function asVec3(p: [number, number] | WireVec3, z = 0): WireVec3 { return [p[0], p[1], p[2] ?? z]; }
function validPoint(p: unknown): p is WireVec3 { return Array.isArray(p) && p.length === 3 && p.every(v => typeof v === 'number' && Number.isFinite(v)); }
function inflateObstacle(o: WireObstacle, amount: number): WireObstacle { return { id: o.id, min_mm: o.min_mm.map(v => v - amount) as WireVec3, max_mm: o.max_mm.map(v => v + amount) as WireVec3 }; }
function validateObstacles(obstacles: WireObstacle[]): void {
  for (const [index, obstacle] of obstacles.entries()) {
    if (!obstacle || typeof obstacle.id !== 'string' || !validPoint(obstacle.min_mm) || !validPoint(obstacle.max_mm)) throw new Error(`Obstacle ${index + 1} must have an id and finite 3D min_mm/max_mm coordinates.`);
    if (obstacle.min_mm.some((value, axis) => value > obstacle.max_mm[axis])) throw new Error(`Obstacle ${obstacle.id} min_mm must be less than or equal to max_mm on every axis.`);
  }
}
const MAX_VISIBILITY_NODES = 20_000;
function chooseOrthogonalPath(start: WireVec3, end: WireVec3, obstacles: WireObstacle[], endpointOwners: Set<string>): { points: WireVec3[] | null; failure?: string } {
  const uniqueObstacles = uniqueObstacleGeometry(obstacles);
  const coordinates = routingCoordinates(start, end, uniqueObstacles);
  const uniqueCoordinateNodeUpperBound = coordinates.reduce((count, axis) => count * axis.length, 1);
  if (uniqueCoordinateNodeUpperBound > MAX_VISIBILITY_NODES) return { points: null, failure: `visibility graph would exceed ${MAX_VISIBILITY_NODES} nodes (${uniqueCoordinateNodeUpperBound} unique-coordinate combinations); reduce obstacle count or split the routing analysis` };
  const points = createVisibilityNodes(coordinates, start, end, uniqueObstacles);
  const graph = buildVisibilityGraph(points, uniqueObstacles, start, end, endpointOwners);
  return shortestVisibilityPath(points, graph, start, end);
}
function uniqueObstacleGeometry(obstacles: WireObstacle[]): WireObstacle[] {
  const unique = new Map<string, WireObstacle>();
  for (const obstacle of obstacles) unique.set(`${pointKey(obstacle.min_mm)}|${pointKey(obstacle.max_mm)}`, obstacle);
  return [...unique.values()];
}
function routingCoordinates(start: WireVec3, end: WireVec3, obstacles: WireObstacle[]): number[][] {
  const axes = [0, 1, 2];
  return axes.map(axis => [...new Set([start[axis], end[axis], ...obstacles.flatMap(obstacle => [obstacle.min_mm[axis] - 1e-6, obstacle.max_mm[axis] + 1e-6])])].sort((a, b) => a - b));
}
function createVisibilityNodes(coordinates: number[][], start: WireVec3, end: WireVec3, obstacles: WireObstacle[]): Map<string, WireVec3> {
  const points = new Map<string, WireVec3>();
  for (const x of coordinates[0]) for (const y of coordinates[1]) for (const z of coordinates[2]) {
    const point: WireVec3 = [x, y, z];
    if (samePoint(point, start) || samePoint(point, end) || !obstacles.some(obstacle => pointInAabb(point, obstacle.min_mm, obstacle.max_mm))) points.set(pointKey(point), point);
  }
  points.set(pointKey(start), start);
  points.set(pointKey(end), end);
  return points;
}
type VisibilityEdge = { key: string; distance: number };
type VisibilityGraph = Map<string, VisibilityEdge[]>;
function buildVisibilityGraph(points: Map<string, WireVec3>, obstacles: WireObstacle[], start: WireVec3, end: WireVec3, endpointOwners: Set<string>): VisibilityGraph {
  const graph: VisibilityGraph = new Map([...points.keys()].map(key => [key, []]));
  for (const axis of [0, 1, 2]) connectAxisLines(points, graph, obstacles, axis, start, end, endpointOwners);
  return graph;
}
function connectAxisLines(points: Map<string, WireVec3>, graph: VisibilityGraph, obstacles: WireObstacle[], axis: number, start: WireVec3, end: WireVec3, endpointOwners: Set<string>): void {
  const groups = new Map<string, Array<{ key: string; point: WireVec3 }>>();
  for (const [key, point] of points) {
    const other = [0, 1, 2].filter(candidate => candidate !== axis).map(candidate => point[candidate]).join(',');
    const group = groups.get(other) ?? [];
    group.push({ key, point }); groups.set(other, group);
  }
  for (const group of groups.values()) connectSortedGroup(group, graph, obstacles, axis, start, end, endpointOwners);
}
function connectSortedGroup(group: Array<{ key: string; point: WireVec3 }>, graph: VisibilityGraph, obstacles: WireObstacle[], axis: number, start: WireVec3, end: WireVec3, endpointOwners: Set<string>): void {
  group.sort((a, b) => a.point[axis] - b.point[axis]);
  for (let index = 1; index < group.length; index++) {
    const a = group[index - 1], b = group[index];
    if (obstacles.some(obstacle => segmentIntersectsAabb(a.point, b.point, obstacle.min_mm, obstacle.max_mm) && !endpointOwnerAccess(a.point, b.point, obstacle, start, end, endpointOwners))) continue;
    addVisibilityEdge(graph, a.key, b.key, Math.abs(a.point[axis] - b.point[axis]));
  }
}
function endpointOwnerAccess(a: WireVec3, b: WireVec3, obstacle: WireObstacle, start: WireVec3, end: WireVec3, endpointOwners: Set<string>): boolean {
  if (!endpointOwners.has(obstacle.id)) return false;
  const startsInside = pointInAabb(start, obstacle.min_mm, obstacle.max_mm);
  const endsInside = pointInAabb(end, obstacle.min_mm, obstacle.max_mm);
  const startsAtEndpoint = samePoint(a, start) || samePoint(b, start);
  const endsAtEndpoint = samePoint(a, end) || samePoint(b, end);
  // Only the endpoint-adjacent segment that actually exits the owner box is
  // exempt. A segment that continues inside the box must still be blocked.
  return startsInside && startsAtEndpoint && !pointInAabb(samePoint(a, start) ? b : a, obstacle.min_mm, obstacle.max_mm)
    || endsInside && endsAtEndpoint && !pointInAabb(samePoint(a, end) ? b : a, obstacle.min_mm, obstacle.max_mm);
}
function addVisibilityEdge(graph: VisibilityGraph, a: string, b: string, distance: number): void {
  graph.get(a)?.push({ key: b, distance });
  graph.get(b)?.push({ key: a, distance });
}
function shortestVisibilityPath(points: Map<string, WireVec3>, graph: VisibilityGraph, start: WireVec3, end: WireVec3): { points: WireVec3[] | null; failure?: string } {
  const startKey = pointKey(start), endKey = pointKey(end);
  const { distances, previous } = dijkstra(graph, startKey, endKey);
  if (!Number.isFinite(distances.get(endKey))) return { points: null, failure: 'no collision-free orthogonal path exists for the supplied obstacles' };
  const path: WireVec3[] = [end];
  for (let key = endKey; key !== startKey;) { key = previous.get(key)!; path.push(points.get(key)!); }
  return { points: simplify(path.reverse()) };
}
function dijkstra(graph: VisibilityGraph, startKey: string, endKey: string): { distances: Map<string, number>; previous: Map<string, string> } {
  const distances = new Map<string, number>([[startKey, 0]]);
  const previous = new Map<string, string>();
  const queue = new MinPriorityQueue();
  queue.push({ key: startKey, distance: 0 });
  while (queue.size) {
    const item = queue.pop()!;
    if (item.distance !== distances.get(item.key)) continue;
    if (item.key === endKey) break;
    relaxEdges(graph.get(item.key) ?? [], item, distances, previous, queue);
  }
  return { distances, previous };
}
function relaxEdges(edges: VisibilityEdge[], item: { key: string; distance: number }, distances: Map<string, number>, previous: Map<string, string>, queue: MinPriorityQueue): void {
  for (const edge of edges) {
    const next = item.distance + edge.distance;
    if (next < (distances.get(edge.key) ?? Infinity)) {
      distances.set(edge.key, next); previous.set(edge.key, item.key); queue.push({ key: edge.key, distance: next });
    }
  }
}
class MinPriorityQueue {
  private items: Array<{ key: string; distance: number }> = [];
  get size(): number { return this.items.length; }
  push(item: { key: string; distance: number }): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].distance <= item.distance) break;
      this.items[index] = this.items[parent]; index = parent;
    }
    this.items[index] = item;
  }
  pop(): { key: string; distance: number } | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (!last || this.items.length === 0) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.items[child + 1].distance < this.items[child].distance) child++;
      if (last.distance <= this.items[child].distance) break;
      this.items[index] = this.items[child]; index = child;
    }
    this.items[index] = last;
    return first;
  }
}
function pointKey(point: WireVec3): string { return point.join(','); }
function samePoint(a: WireVec3, b: WireVec3): boolean { return a.every((value, axis) => Math.abs(value - b[axis]) < 1e-9); }
function pointInAabb(point: WireVec3, min: WireVec3, max: WireVec3): boolean { return point.every((value, axis) => value >= min[axis] && value <= max[axis]); }
function simplify(points: WireVec3[]): WireVec3[] { return points.filter((p, i) => i === 0 || i === points.length - 1 || !collinear(points[i - 1], p, points[i + 1])); }
function collinear(a: WireVec3, b: WireVec3, c: WireVec3): boolean { const ab = sub(b, a), bc = sub(c, b); return Math.abs(ab[0] * bc[1] - ab[1] * bc[0]) < 1e-9 && Math.abs(ab[0] * bc[2] - ab[2] * bc[0]) < 1e-9 && Math.abs(ab[1] * bc[2] - ab[2] * bc[1]) < 1e-9; }
function countBends(points: WireVec3[]): number { return Math.max(0, points.length - 2); }
function polylineLength(points: WireVec3[]): number { return points.slice(1).reduce((sum, p, i) => sum + distance(points[i], p), 0); }
function sub(a: WireVec3, b: WireVec3): WireVec3 { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function distance(a: WireVec3, b: WireVec3): number { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
function segmentIntersectsAabb(a: WireVec3, b: WireVec3, min: WireVec3, max: WireVec3): boolean {
  let lo = 0, hi = 1;
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-9) { if (a[i] < min[i] || a[i] > max[i]) return false; continue; }
    let t0 = (min[i] - a[i]) / d, t1 = (max[i] - a[i]) / d;
    if (t0 > t1) [t0, t1] = [t1, t0];
    lo = Math.max(lo, t0); hi = Math.min(hi, t1);
    if (lo > hi) return false;
  }
  return true;
}
