// src/mcp/index.ts
export { createMcpServer } from './server';
export { evaluateScriptTool, type EvaluateScriptInput, type EvaluateScriptOutput } from './tools/evaluateScript';
export { listFeaturesTool, type ListFeaturesInput, type ListFeaturesOutput } from './tools/listFeatures';
export { getShapeInfoTool, type GetShapeInfoInput, type GetShapeInfoOutput } from './tools/getShapeInfo';
