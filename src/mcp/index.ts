// src/mcp/index.ts
export { createMcpServer } from './server';
export { evaluateScriptTool, type EvaluateScriptInput, type EvaluateScriptOutput } from './tools/evaluateScript';
export { listFeaturesTool, type ListFeaturesInput, type ListFeaturesOutput } from './tools/listFeatures';
export { getShapeInfoTool, type GetShapeInfoInput, type GetShapeInfoOutput } from './tools/getShapeInfo';
export { listTopologyTool, type ListTopologyInput, type ListTopologyOutput } from './tools/listTopology';
export { getEdgesOfTool, type GetEdgesOfInput, type GetEdgesOfOutput } from './tools/getEdgesOf';
export { whyDidThisFailTool, type WhyDidThisFailInput, type WhyDidThisFailOutput } from './tools/whyDidThisFail';
export { setParamValueTool, type SetParamValueInput, type SetParamValueOutput } from './tools/setParamValue';
export { addFeatureTool, type AddFeatureInput, type AddFeatureOutput } from './tools/addFeature';
export { removeFeatureTool, type RemoveFeatureInput, type RemoveFeatureOutput } from './tools/removeFeature';
