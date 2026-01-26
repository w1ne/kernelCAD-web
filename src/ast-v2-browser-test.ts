import { testParse, testVariableExtraction, testCodeGeneration, testSimpleInsertion, testReturnUpdate } from './lib/ast-v2';

// Expose for browser console testing
(window as any).testASTv2 = testParse;
(window as any).testASTv2Variables = testVariableExtraction;
(window as any).testASTv2CodeGen = testCodeGeneration;
(window as any).testASTv2Insertion = testSimpleInsertion;
(window as any).testASTv2ReturnUpdate = testReturnUpdate;

console.log('[AST-V2] Test functions exposed:');
console.log('  window.testASTv2() - Test basic parsing');
console.log('  window.testASTv2Variables() - Test variable extraction');
console.log('  window.testASTv2CodeGen() - Test code generation');
console.log('  window.testASTv2Insertion() - Test simple insertion');
console.log('  window.testASTv2ReturnUpdate() - Test return update (Phase 5)');
