// Run from the repository root with: npx tsx docs/demos/shared-selection/invoke.ts get
// Studio must already be open on examples/bracket-with-hole.kcad.ts at port 5192.
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';
const studio_url = 'http://127.0.0.1:5192';
const response = await fetch(`${studio_url}/__kernelcad/session?script=examples/bracket-with-hole.kcad.ts`);
const { sessionToken: session } = await response.json() as { sessionToken: string };
const current = await callMcpTool('get_selection', { studio_url, session }) as { modelGeneration: number };
const action = process.argv[2] ?? 'get';
const selection = action === 'clear' ? null : { shapeIndex: 0, kind: 'edge', id: 6, featureId: 'box_1' };
const result = await callMcpTool(action === 'get' ? 'get_selection' : 'set_selection', {
  studio_url, session, ...(action === 'get' ? {} : { selection, model_generation: current.modelGeneration }),
});
console.log(JSON.stringify({ action, result }, null, 2));
