// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { inspectAssemblyTool } from './inspectAssembly';
import { inspectRobotTool } from './inspectRobot';
import { inspectStepTool } from './inspectStep';
import { getShapeInfoTool } from './getShapeInfo';
import { listFeaturesTool } from './listFeatures';
import { listAssembliesTool } from './listAssemblies';
import { listTopologyTool } from './listTopology';
import { listEdgesTool } from './listEdges';
import { getEdgesOfTool } from './getEdgesOf';
import { listFacesTool } from './listFaces';
import { listFaceLabelsTool } from './listFaceLabels';
import { listMatesTool } from './listMates';
import { listConstraintsTool } from './constraints';
import { listPartStatsTool } from './listPartStats';
import { getBendTableTool } from './getBendTable';
import { paramsListTool } from './paramsList';
import { listPartCategoriesTool } from './listPartCategories';
import { listPartFamiliesTool } from './listPartFamilies';

/** The introspection subject. Each value maps 1:1 to a dedicated reader. */
export type InspectOf =
  | 'assembly'
  | 'robot'
  | 'step'
  | 'shape'
  | 'features'
  | 'assemblies'
  | 'topology'
  | 'edges'
  | 'face-edges'
  | 'faces'
  | 'face-labels'
  | 'mates'
  | 'constraints'
  | 'part-stats'
  | 'bend-table'
  | 'params'
  | 'part-categories'
  | 'part-families';

export interface InspectInput {
  of: InspectOf;
  /**
   * Subject-specific params, forwarded verbatim. Most readers accept
   * { file?, code? }; additionally:
   * - assembly/robot: { assembly? }
   * - shape/topology/features/face-labels: { feature_id? }
   * - edges/faces: { feature_id?, query? }   (EdgeQuery / FaceQuery)
   * - face-edges: { feature_id?, face_name }  (canonical face name; required)
   */
  [key: string]: unknown;
}

/**
 * Unified read/introspection entrypoint. Replaces inspect_assembly,
 * inspect_robot, inspect_step, get_shape_info, list_features, list_assemblies,
 * list_topology, list_edges, get_edges_of, list_faces, list_face_labels,
 * list_mates, list_constraints, list_part_stats, get_bend_table, params_list.
 *
 * Pure routing layer: dispatches on `of` and forwards all other params to the
 * underlying reader unchanged.
 */
export function inspectTool(input: InspectInput): Promise<unknown> {
  const { of, ...rest } = input;
  switch (of) {
    case 'assembly':
      return inspectAssemblyTool(rest as unknown as Parameters<typeof inspectAssemblyTool>[0]);
    case 'robot':
      return inspectRobotTool(rest as unknown as Parameters<typeof inspectRobotTool>[0]);
    case 'step':
      return inspectStepTool(rest as unknown as Parameters<typeof inspectStepTool>[0]);
    case 'shape':
      return getShapeInfoTool(rest as unknown as Parameters<typeof getShapeInfoTool>[0]);
    case 'features':
      return listFeaturesTool(rest as unknown as Parameters<typeof listFeaturesTool>[0]);
    case 'assemblies':
      return listAssembliesTool(rest as unknown as Parameters<typeof listAssembliesTool>[0]);
    case 'topology':
      return listTopologyTool(rest as unknown as Parameters<typeof listTopologyTool>[0]);
    case 'edges':
      return listEdgesTool(rest as unknown as Parameters<typeof listEdgesTool>[0]);
    case 'face-edges':
      return getEdgesOfTool(rest as unknown as Parameters<typeof getEdgesOfTool>[0]);
    case 'faces':
      return listFacesTool(rest as unknown as Parameters<typeof listFacesTool>[0]);
    case 'face-labels':
      return listFaceLabelsTool(rest as unknown as Parameters<typeof listFaceLabelsTool>[0]);
    case 'mates':
      return listMatesTool(rest as unknown as Parameters<typeof listMatesTool>[0]);
    case 'constraints':
      return listConstraintsTool(rest as unknown as Parameters<typeof listConstraintsTool>[0]);
    case 'part-stats':
      return listPartStatsTool(rest as unknown as Parameters<typeof listPartStatsTool>[0]);
    case 'bend-table':
      return getBendTableTool(rest as unknown as Parameters<typeof getBendTableTool>[0]);
    case 'params':
      return paramsListTool();
    case 'part-categories':
      return listPartCategoriesTool();
    case 'part-families':
      return listPartFamiliesTool(rest as unknown as Parameters<typeof listPartFamiliesTool>[0]);
    default:
      return Promise.reject(
        new Error(
          `Unknown inspect subject: ${String(of)}. Valid: assembly, robot, step, shape, ` +
            `features, assemblies, topology, edges, face-edges, faces, face-labels, mates, ` +
            `constraints, part-stats, bend-table, params, part-categories, part-families.`,
        ),
      );
  }
}
