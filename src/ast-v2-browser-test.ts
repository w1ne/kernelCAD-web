import { testParse, testVariableExtraction, testCodeGeneration, testSimpleInsertion, testReturnUpdate } from './lib/ast';

// Expose for browser console testing
const win = window as unknown as Record<string, unknown>;
win.testASTv2 = testParse;
win.testASTv2Variables = testVariableExtraction;
win.testASTv2CodeGen = testCodeGeneration;
win.testASTv2Insertion = testSimpleInsertion;
win.testASTv2ReturnUpdate = testReturnUpdate;

console.log('[AST-V2] Test functions exposed:');
console.log('  window.testASTv2() - Test basic parsing');
console.log('  window.testASTv2Variables() - Test variable extraction');
console.log('  window.testASTv2CodeGen() - Test code generation');
console.log('  window.testASTv2Insertion() - Test simple insertion');
console.log('  window.testASTv2ReturnUpdate() - Test return update (Phase 5)');
