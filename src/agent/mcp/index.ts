// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/mcp/index.ts
export { createMcpServer } from './server';
export { evaluateScriptTool, type EvaluateScriptInput, type EvaluateScriptOutput } from './tools/evaluateScript';
export { listFeaturesTool, type ListFeaturesInput, type ListFeaturesOutput } from './tools/listFeatures';
export { listAssembliesTool, type ListAssembliesInput, type ListAssembliesOutput } from './tools/listAssemblies';
export { getShapeInfoTool, type GetShapeInfoInput, type GetShapeInfoOutput } from './tools/getShapeInfo';
export { listTopologyTool, type ListTopologyInput, type ListTopologyOutput } from './tools/listTopology';
export { getEdgesOfTool, type GetEdgesOfInput, type GetEdgesOfOutput } from './tools/getEdgesOf';
export { whyDidThisFailTool, type WhyDidThisFailInput, type WhyDidThisFailOutput } from './tools/whyDidThisFail';
export { setParamValueTool, type SetParamValueInput, type SetParamValueOutput } from './tools/setParamValue';
export { addFeatureTool, type AddFeatureInput, type AddFeatureOutput } from './tools/addFeature';
export { removeFeatureTool, type RemoveFeatureInput, type RemoveFeatureOutput } from './tools/removeFeature';
export { paramsListTool, type ParamsListInput, type ParamsListOutput } from './tools/paramsList';
export {
  addConstraintTool,
  listConstraintsTool,
  solveSketchTool,
  SUPPORTED_CONSTRAINT_TYPES,
  type AddConstraintInput,
  type AddConstraintOutput,
  type ListConstraintsInput,
  type ListConstraintsOutput,
  type SolveSketchInput,
  type SolveSketchOutput,
} from './tools/constraints';
