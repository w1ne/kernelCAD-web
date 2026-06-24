import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { addAssemblyPartSourceTool } from '../../../src/agent/mcp/tools/addAssemblyPartSource';
import { addPartConnectorSourceTool } from '../../../src/agent/mcp/tools/addPartConnectorSource';
import { addMateSourceTool } from '../../../src/agent/mcp/tools/addMateSource';
import { addMateCouplingSourceTool } from '../../../src/agent/mcp/tools/addMateCouplingSource';
import { addTransmissionSourceTool } from '../../../src/agent/mcp/tools/addTransmissionSource';
import { addWorkspaceTargetSourceTool } from '../../../src/agent/mcp/tools/addWorkspaceTargetSource';
import { setSceneReturnSourceTool } from '../../../src/agent/mcp/tools/setSceneReturnSource';
import { inspectAssemblyTool } from '../../../src/agent/mcp/tools/inspectAssembly';
import { reviewCadTool } from '../../../src/agent/mcp/tools/reviewCad';
import { TOOL_REGISTRY, callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const CONNECTED_SEED = [
  'const baseShape = box(40, 40, 4, true);',
  'const linkShape = box(20, 12, 8, true).translate(0, 0, 6);',
  "const rig = assembly('durable source rig');",
  'return rig.model();',
].join('\n');

const DRIVEN_SEED = [
  'const baseShape = box(30, 30, 4, true);',
  'const driverShape = cylinder(8, 4).translate(0, 0, 2);',
  'const followerShape = cylinder(8, 4).translate(0, 0, 2);',
  "const rig = assembly('durable driven rig');",
  'return rig.model();',
].join('\n');

function expectNoEvaluationErrors(result: { diagnostics?: Array<{ severity: string }> }) {
  expect(result.diagnostics?.filter(diagnostic => diagnostic.severity === 'error') ?? []).toEqual([]);
}

describe('durable assembly source-edit MCP tools', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('builds a mechanically reviewed connected assembly using source edits only', async () => {
    let code = CONNECTED_SEED;

    const basePart = await addAssemblyPartSourceTool({
      code,
      assembly_binding: 'rig',
      part_name: 'base',
      shape_expression: 'baseShape',
      binding_name: 'basePart',
    });
    expect(basePart.ok).toBe(true);
    expectNoEvaluationErrors(basePart);
    code = basePart.new_code!;

    const linkPart = await addAssemblyPartSourceTool({
      code,
      assembly_binding: 'rig',
      part_name: 'link',
      shape_expression: 'linkShape',
      binding_name: 'linkPart',
    });
    expect(linkPart.ok).toBe(true);
    expectNoEvaluationErrors(linkPart);
    code = linkPart.new_code!;

    const baseConnector = await addPartConnectorSourceTool({
      code,
      part_binding: 'basePart',
      name: 'top',
      type: 'frame',
      origin: [0, 0, 2],
    });
    expect(baseConnector.ok).toBe(true);
    expectNoEvaluationErrors(baseConnector);
    code = baseConnector.new_code!;

    const linkConnector = await addPartConnectorSourceTool({
      code,
      part_binding: 'linkPart',
      name: 'bottom',
      type: 'frame',
      origin: [0, 0, 2],
    });
    expect(linkConnector.ok).toBe(true);
    expectNoEvaluationErrors(linkConnector);
    code = linkConnector.new_code!;

    const mate = await addMateSourceTool({
      code,
      assembly_binding: 'rig',
      name: 'base-link',
      a: 'base.top',
      b: 'link.bottom',
      type: 'fastened',
    });
    expect(mate.ok).toBe(true);
    expectNoEvaluationErrors(mate);
    code = mate.new_code!;

    const sceneReturn = await setSceneReturnSourceTool({
      code,
      assembly_binding: 'rig',
      mode: 'solvedModel',
    });
    expect(sceneReturn.ok).toBe(true);
    expectNoEvaluationErrors(sceneReturn);
    code = sceneReturn.new_code!;

    expect(code).toContain("const basePart = rig.part('base', baseShape);");
    expect(code).toContain("basePart.connector('top'");
    expect(code).toContain("rig.mate('base-link', 'base.top', 'link.bottom', 'fastened'");
    expect(code).toContain('return rig.solvedModel({});');

    const review = await reviewCadTool({
      code,
      includeInterference: false,
      includePoseEnvelope: false,
    });
    expect(review.ok).toBe(true);
    if (review.ok) {
      expect(review.fitness.functional).toBe(true);
      expect(review.validator.partCount).toBe(2);
    }

    const inspect = await inspectAssemblyTool({ code });
    expect(inspect.ok).toBe(true);
    if (inspect.ok) {
      expect(inspect.mateCount).toBe(1);
      expect(inspect.parts.map(part => part.name)).toEqual(['base', 'link']);
    }
  });

  it('persists mate couplings, transmissions, workspace targets, and final scene return', async () => {
    let code = DRIVEN_SEED;

    for (const input of [
      { part_name: 'base', shape_expression: 'baseShape', binding_name: 'basePart' },
      { part_name: 'driver', shape_expression: 'driverShape', binding_name: 'driverPart' },
      { part_name: 'follower', shape_expression: 'followerShape', binding_name: 'followerPart' },
    ]) {
      const result = await addAssemblyPartSourceTool({
        code,
        assembly_binding: 'rig',
        ...input,
      });
      expect(result.ok).toBe(true);
      code = result.new_code!;
    }

    for (const input of [
      { part_binding: 'basePart', name: 'driverAxis', origin: [0, 0, 2] as const },
      { part_binding: 'basePart', name: 'followerAxis', origin: [0, 0, 2] as const },
      { part_binding: 'driverPart', name: 'axis', origin: [0, 0, 2] as const },
      { part_binding: 'followerPart', name: 'axis', origin: [0, 0, 2] as const },
    ]) {
      const result = await addPartConnectorSourceTool({
        code,
        type: 'axis',
        axis: [0, 0, 1],
        ...input,
      });
      expect(result.ok).toBe(true);
      code = result.new_code!;
    }

    const driveMate = await addMateSourceTool({
      code,
      assembly_binding: 'rig',
      name: 'drive',
      a: 'base.driverAxis',
      b: 'driver.axis',
      type: 'revolute',
      limitsDeg: [0, 90],
    });
    expect(driveMate.ok).toBe(true);
    code = driveMate.new_code!;

    const swingMate = await addMateSourceTool({
      code,
      assembly_binding: 'rig',
      name: 'swing',
      a: 'base.followerAxis',
      b: 'follower.axis',
      type: 'revolute',
      limitsDeg: [0, 90],
    });
    expect(swingMate.ok).toBe(true);
    code = swingMate.new_code!;

    const coupling = await addMateCouplingSourceTool({
      code,
      assembly_binding: 'rig',
      driven: 'swing',
      source: 'drive',
      ratio: 1,
    });
    expect(coupling.ok).toBe(true);
    code = coupling.new_code!;

    const transmission = await addTransmissionSourceTool({
      code,
      assembly_binding: 'rig',
      name: 'gear-train',
      kind: 'gear-pair',
      sourceMate: 'drive',
      drivenMates: ['swing'],
      input: 'driver',
      output: 'follower',
      path: ['driver', 'follower'],
      ratio: 1,
      notes: 'Durable source intent inserted by MCP.',
    });
    expect(transmission.ok).toBe(true);
    code = transmission.new_code!;

    const workspace = await addWorkspaceTargetSourceTool({
      code,
      assembly_binding: 'rig',
      connector_ref: 'follower.axis',
      reachable: [[0, 0, 2]],
      toleranceMm: 1,
    });
    expect(workspace.ok).toBe(true);
    code = workspace.new_code!;

    const sceneReturn = await setSceneReturnSourceTool({
      code,
      assembly_binding: 'rig',
      mode: 'solvedModel',
      poses: { drive: 30 },
      options: { validate: 'warn', posesGate: 'envelope' },
    });
    expect(sceneReturn.ok).toBe(true);
    code = sceneReturn.new_code!;

    expect(code).toContain("rig.coupleMates('swing', { source: 'drive', ratio: 1 });");
    expect(code).toContain("rig.transmission('gear-train'");
    expect(code).toContain("rig.workspace('follower.axis'");
    expect(code).toContain("return rig.solvedModel({ drive: 30 }, { validate: 'warn', posesGate: 'envelope' });");

    const inspect = await inspectAssemblyTool({ code });
    expect(inspect.ok).toBe(true);
    if (inspect.ok) {
      expect(inspect.transmissions).toEqual([
        expect.objectContaining({
          name: 'gear-train',
          kind: 'gear-pair',
          sourceMate: 'drive',
          drivenMates: ['swing'],
          path: ['driver', 'follower'],
        }),
      ]);
      expect(inspect.mates.map(mateRecord => mateRecord.name)).toEqual(['drive', 'swing']);
    }
  });

  it('exposes the source-only assembly tools through the MCP registry', async () => {
    const toolNames = TOOL_REGISTRY.map(entry => entry.definition.name);
    // Source-only surface (the ephemeral active-session layer was removed; the
    // mate trio collapsed into add_mate({ relation })).
    expect(toolNames).toEqual(expect.arrayContaining([
      'add_part',
      'add_connector',
      'add_mate',
      'add_workspace_target',
      'set_scene_return',
    ]));
    // Retired names must be gone from the registry.
    for (const retired of [
      'add_assembly_part_source',
      'add_part_connector_source',
      'add_mate_source',
      'add_mate_coupling_source',
      'add_transmission_source',
      'add_workspace_target_source',
      'set_scene_return_source',
    ]) {
      expect(toolNames).not.toContain(retired);
    }

    const result = await callMcpTool('set_scene_return', {
      code: CONNECTED_SEED,
      assembly_binding: 'rig',
      mode: 'model',
    });
    // The edit splices cleanly, but the assembly has no parts, so re-evaluation
    // emits a `requires at least one part` error → ok reflects that failure.
    expect(result).toMatchObject({ ok: false });
    expect((result as { diagnostics?: Array<{ message: string; severity: string }> }).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          message: expect.stringMatching(/requires at least one part/i),
        }),
      ]),
    );

    // add_connector is now the durable source-edit tool — it takes `code` and
    // is no longer the active-session register.
    const connector = TOOL_REGISTRY.find(entry => entry.definition.name === 'add_connector');
    expect(connector?.definition.inputSchema.properties).toHaveProperty('code');
    expect(connector?.definition.description).not.toMatch(/active assembly/i);
  });
});
