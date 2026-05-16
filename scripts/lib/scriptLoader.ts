// Re-export so scripts/captureDemo.ts and tests can keep their existing
// import path. The canonical implementation lives in src/modeling/runtime/
// where the CLI build can pick it up via tsconfig.cli.json's rootDir.
export { loadScriptFeatures, type LoadedScript } from '../../src/modeling/runtime/scriptLoader';
