// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { addConstraintTool, solveSketchTool } from '../tools/constraints';
import { addAssemblyPartSourceTool } from '../tools/addAssemblyPartSource';
import { addPartConnectorSourceTool } from '../tools/addPartConnectorSource';
import { addWorkspaceTargetSourceTool } from '../tools/addWorkspaceTargetSource';
import { setSceneReturnSourceTool } from '../tools/setSceneReturnSource';
import { addMateAuthoringTool } from '../tools/addMateAuthoring';
import { solveMatesTool } from '../tools/solveMates';
import type { ToolRegistryEntry } from './types';

export const sketchAssemblyToolEntries: ToolRegistryEntry[] = [
  {
    definition: {
      name: 'solve_sketch',
      description:
        'Use this when you need to solve a 2D sketch constraint set. ' +
        'Solve a 2D sketch constraint set. Side-effect-free: pass { entities, constraints } and receive solved entities plus the original constraints. Entities are POINT, LINE, and CIRCLE records; constraints use the kernelCAD constraint vocabulary.',
      inputSchema: {
        type: 'object',
        properties: {
          entities: {
            type: 'array',
            description: 'Sketch entities to solve. Lines reference point ids; circles reference a center point id.',
            items: {
              oneOf: [
                { type: 'object', description: 'POINT — a 2D point.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['POINT'] },
                  x: { type: 'number' }, y: { type: 'number' },
                  fixed: { type: 'boolean', description: "If true, the solver won't move this point." },
                }, required: ['id', 'type', 'x', 'y'] },
                { type: 'object', description: 'LINE — references two point ids.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['LINE'] },
                  p1: { type: 'string' }, p2: { type: 'string' },
                }, required: ['id', 'type', 'p1', 'p2'] },
                { type: 'object', description: 'CIRCLE — references a center point id.', properties: {
                  id: { type: 'string' }, type: { type: 'string', enum: ['CIRCLE'] },
                  center: { type: 'string' }, radius: { type: 'number' },
                }, required: ['id', 'type', 'center', 'radius'] },
              ],
            },
          },
          constraints: {
            type: 'array',
            description: 'Constraints to apply to the entities.',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
                entities: { type: 'array', items: { type: 'string' }, description: 'Ids of the entities the constraint relates.' },
                value: { type: 'number', description: 'Required for DISTANCE, RADIUS, and ANGLE.' },
              },
              required: ['id', 'type', 'entities'],
            },
          },
        },
        required: ['entities', 'constraints'],
      },
    },
    handler: input => solveSketchTool(input as unknown as Parameters<typeof solveSketchTool>[0]),
  },
  {
    definition: {
      name: 'add_constraint',
      description:
        'Use this when you need to add a sketch constraint to a list. ' +
        'Append one validated sketch constraint to a constraint list. Side-effect-free: pass { constraints, constraint } and receive the updated list.',
      inputSchema: {
        type: 'object',
        properties: {
          constraints: {
            type: 'array',
            description: 'Existing constraint list to append to (omit for an empty list).',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
                entities: { type: 'array', items: { type: 'string' } },
                value: { type: 'number' },
              },
              required: ['id', 'type', 'entities'],
            },
          },
          constraint: {
            type: 'object',
            description: 'The constraint to append.',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['COINCIDENT', 'DISTANCE', 'HORIZONTAL', 'VERTICAL', 'PARALLEL', 'PERPENDICULAR', 'EQUAL_LENGTH', 'TANGENT', 'RADIUS', 'ANGLE', 'CONCENTRIC', 'SYMMETRIC'] },
              entities: { type: 'array', items: { type: 'string' }, description: 'Ids of the entities the constraint relates.' },
              value: { type: 'number', description: 'Required for DISTANCE, RADIUS, and ANGLE.' },
            },
            required: ['id', 'type', 'entities'],
          },
        },
        required: ['constraint'],
      },
    },
    handler: input => addConstraintTool(input as unknown as Parameters<typeof addConstraintTool>[0]),
  },
  {
    definition: {
      name: 'add_part',
      description:
        'Use this when you need to add a part to an assembly. Durably insert `const <binding> = <assembly>.part(partName, shapeExpression, opts?)` before the final top-level return in a kernelCAD source string. Returns modified source plus diagnostics from re-evaluating it. Side-effect-free: caller persists the returned source.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...), e.g. "arm".' },
          part_name: { type: 'string', description: 'Assembly-unique part name.' },
          shape_expression: { type: 'string', description: 'JS expression for the Shape to pass to assembly.part, inserted verbatim.' },
          binding_name: { type: 'string', description: 'Optional JS const name for the returned AssemblyPartRef. Defaults to a part-name-derived identifier.' },
          at: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] assembly placement.' },
        },
        required: ['code', 'assembly_binding', 'part_name', 'shape_expression'],
      },
    },
    handler: input => addAssemblyPartSourceTool(input as unknown as Parameters<typeof addAssemblyPartSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_connector',
      description:
        'Use this when you need to add a mate connector to a part. Durably insert `<partBinding>.connector(name, { type, origin, axis?, normal? })` before the final top-level return. Use the part binding returned by add_part. Returns modified source plus diagnostics from re-evaluation. Side-effect-free.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          part_binding: { type: 'string', description: 'JS identifier bound to an AssemblyPartRef, e.g. "basePart".' },
          name: { type: 'string', description: 'Connector name unique within the part.' },
          type: { type: 'string', enum: ['frame', 'axis', 'planar', 'ball'] },
          origin: {
            description: 'Origin as [x, y, z] shorthand, or a structured ConnectorOrigin.',
            oneOf: [
              { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3, description: '[x, y, z] shorthand.' },
              { type: 'object', description: 'Explicit numeric origin.', properties: {
                kind: { type: 'string', enum: ['vec3'] },
                value: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              }, required: ['kind', 'value'] },
              { type: 'object', description: 'Topology-derived origin.', properties: {
                kind: { type: 'string', enum: ['topology'] },
                query: { type: 'object', properties: {
                  kind: { type: 'string', enum: ['face-center', 'face-normal', 'vertex', 'edge-axis'] },
                  name: { type: 'string' },
                }, required: ['kind', 'name'] },
              }, required: ['kind', 'query'] },
            ],
          },
          axis: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] axis.' },
          normal: { type: 'array', items: { type: 'number' }, description: 'Optional [x, y, z] normal.' },
        },
        required: ['code', 'part_binding', 'name', 'type', 'origin'],
      },
    },
    handler: input => addPartConnectorSourceTool(input as unknown as Parameters<typeof addPartConnectorSourceTool>[0]),
  },
  {
    definition: {
      name: 'add_mate',
      description:
        "Use this when you need to author a mate-graph relationship into the source, selected by `relation` (default 'mate'):\n" +
        "- 'mate' — a typed mate between two connectors ({ name, a, b, type, pose?, limitsDeg?, limitsMm? }).\n" +
        "- 'coupling' — couple a driven mate to a source mate by ratio ({ driven, source, ratio, offset? }).\n" +
        "- 'transmission' — a physical drive path across mates ({ name, kind, sourceMate, drivenMates, path, ... }).\n" +
        'All durably edit source and need { code, assembly_binding }. Params other than `relation` are forwarded verbatim; each relation fails closed on its own missing required params.',
      inputSchema: {
        type: 'object',
        properties: {
          relation: { type: 'string', enum: ['mate', 'coupling', 'transmission'], description: "Which relationship to author (default 'mate')." },
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          name: { type: 'string', description: "relation:'mate'|'transmission' — name unique within the assembly." },
          a: { type: 'string', description: "relation:'mate' — connector ref \"<partName>.<connectorName>\"." },
          b: { type: 'string', description: "relation:'mate' — connector ref \"<partName>.<connectorName>\"." },
          type: { type: 'string', enum: ['fastened', 'revolute', 'prismatic', 'cylindrical', 'planar', 'ball', 'pin_slot'], description: "relation:'mate' — mate type." },
          pose: { description: "relation:'mate' — optional mate pose." },
          limitsDeg: { type: 'array', items: { type: 'number' }, description: "relation:'mate' — optional [minDeg, maxDeg]." },
          limitsMm: { type: 'array', items: { type: 'number' }, description: "relation:'mate' — optional [minMm, maxMm]." },
          driven: { type: 'string', description: "relation:'coupling' — driven mate name." },
          source: { type: 'string', description: "relation:'coupling' — source mate name." },
          ratio: { type: 'number', description: "relation:'coupling' — driven pose = source pose * ratio + offset." },
          offset: { type: 'number', description: "relation:'coupling' — optional pose offset." },
          kind: { type: 'string', enum: ['direct-horn', 'link-rod', 'four-bar', 'gear-pair', 'belt', 'tendon'], description: "relation:'transmission' — transmission kind." },
          sourceMate: { type: 'string', description: "relation:'transmission' — source mate name." },
          drivenMates: { type: 'array', items: { type: 'string' }, description: "relation:'transmission' — driven mate names." },
          actuator: { type: 'string', description: "relation:'transmission' — optional actuator." },
          input: { type: 'string', description: "relation:'transmission' — optional input." },
          output: { type: 'string', description: "relation:'transmission' — optional output." },
          path: { type: 'array', items: { type: 'string' }, description: "relation:'transmission' — drive path." },
          notes: { type: 'string', description: "relation:'transmission' — optional notes." },
        },
        required: ['code', 'assembly_binding'],
        allOf: [
          { if: { properties: { relation: { const: 'coupling' } }, required: ['relation'] }, then: { required: ['driven', 'source', 'ratio'] } },
          { if: { properties: { relation: { const: 'transmission' } }, required: ['relation'] }, then: { required: ['name', 'kind', 'sourceMate', 'drivenMates', 'path'] } },
          { if: { properties: { relation: { enum: ['coupling', 'transmission'] } }, required: ['relation'] }, then: {}, else: { required: ['name', 'a', 'b', 'type'] } },
        ],
      },
    },
    handler: input => addMateAuthoringTool(input as unknown as Parameters<typeof addMateAuthoringTool>[0]),
  },
  {
    definition: {
      name: 'add_workspace_target',
      description:
        'Use this when you need to declare a reachability target for a connector. Durably insert `<assembly>.workspace(connectorRef, { reachable, toleranceMm? })` before the final top-level return. Workspace targets are checked by solvedModel validation/review pose-envelope gates. Returns modified source plus diagnostics from re-evaluation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          connector_ref: { type: 'string', description: 'Connector ref "<partName>.<connectorName>".' },
          reachable: {
            type: 'array',
            description: 'World-frame Vec3 targets the connector must be able to reach.',
            items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
          },
          toleranceMm: { type: 'number', description: 'Optional non-negative tolerance in mm.' },
        },
        required: ['code', 'assembly_binding', 'connector_ref', 'reachable'],
      },
    },
    handler: input => addWorkspaceTargetSourceTool(input as unknown as Parameters<typeof addWorkspaceTargetSourceTool>[0]),
  },
  {
    definition: {
      name: 'set_scene_return',
      description:
        'Use this when you need to set how the script returns its assembly. Replace the final top-level return statement with `return <assembly>.model();` or `return <assembly>.solvedModel(poses, options?);`. Use solvedModel for mate-authored mechanisms so FK and validation run. Returns modified source plus diagnostics from re-evaluation.',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'The .kcad.ts source code.' },
          assembly_binding: { type: 'string', description: 'JS identifier bound to assembly(...).' },
          mode: { type: 'string', enum: ['model', 'solvedModel'] },
          poses: { type: 'object', description: 'Optional solvedModel pose overrides keyed by mate name. Defaults to {}.' },
          options: { type: 'object', description: "Optional solvedModel options such as { validate: 'warn', posesGate: 'envelope' }." },
        },
        required: ['code', 'assembly_binding', 'mode'],
      },
    },
    handler: input => setSceneReturnSourceTool(input as unknown as Parameters<typeof setSceneReturnSourceTool>[0]),
  },
  {
    definition: {
      name: 'solve_mates',
      description: 'Use this when you need to solve the mate graph and get part poses. Run the v0.6 mate-graph solver on the active assembly. Returns { status, poses, iterations? } where each pose is a serialized Transform ({ translation, rotateAxis, rotateDeg }). Optional poses overrides mate pose values by mate name.',
      inputSchema: {
        type: 'object',
        properties: {
          assembly: { type: 'string' },
          poses: { type: 'object', description: 'Optional numeric pose overrides keyed by mate name.' },
        },
      },
    },
    handler: input => solveMatesTool(input as unknown as Parameters<typeof solveMatesTool>[0]),
  },
];
