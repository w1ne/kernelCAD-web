// Reproducible analysis demo for route_wires; emits route metrics and evidence JSON.
import { readFile, writeFile } from 'node:fs/promises';
import { routeWires } from '../../../src/agent/mcp/tools/routeWires.ts';
const handoff = JSON.parse(await readFile(new URL('../../../tests/fixtures/argon/handoff-drawbot.json', import.meta.url), 'utf8'));
const result = routeWires({ handoff, clearance_mm: 1, bend_radius_mm: 2 });
await writeFile(new URL('./result.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ wires: handoff.wires.length, resolved: result.routes.length, unresolved: result.unresolved_wire_count, routes: result.routes.length, collisions: result.routes.reduce((n, route) => n + route.collisions.length, 0) }));
