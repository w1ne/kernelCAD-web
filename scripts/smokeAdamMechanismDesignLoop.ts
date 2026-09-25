// SPDX-License-Identifier: MIT
// Smoke: multi-body mechanism evaluate + design_loop must go green.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateScriptTool } from '../src/agent/mcp/tools/evaluateScript';
import { designLoopTool } from '../src/agent/mcp/tools/designLoop';

async function main(): Promise<void> {
  const mechanismPath = resolve('docs/agent/smoke/mechanism.kcad.ts');
  const housingPath = resolve('docs/agent/smoke/housing.kcad.ts');
  const mechanismCode = readFileSync(mechanismPath, 'utf8');
  const housingCode = readFileSync(housingPath, 'utf8');

  const mechanismEvaluate = await evaluateScriptTool({ code: mechanismCode });
  const housingEvaluate = await evaluateScriptTool({ code: housingCode });

  const housingDesignLoop = await designLoopTool({
    goal: 'Build a real production bearing housing enclosure',
    requireVisualReview: false,
    autoRevise: false,
    attempts: [{ id: 'housing', title: 'housing', code: housingCode }],
  });

  const mechanismDesignLoop = await designLoopTool({
    goal: 'Build a real complex robot arm multi-body mechanism',
    requireVisualReview: false,
    autoRevise: false,
    includeInterference: true,
    attempts: [{ id: 'mechanism', title: 'mechanism', code: mechanismCode }],
  });

  const toyFailClosed = await designLoopTool({
    goal: 'Build a real production bearing housing enclosure',
    requireVisualReview: false,
    autoRevise: false,
    attempts: [{
      id: 'toy',
      title: 'toy',
      code: [
        'const a = box(30, 30, 10);',
        'const b = box(20, 20, 10).translate(5, 5, 10);',
        'const c = box(10, 10, 10).translate(10, 10, 20);',
        'return a.union(b).union(c);',
      ].join('\n'),
    }],
  });

  const evidence = {
    at: new Date().toISOString(),
    timezone: 'Europe/Budapest (UTC+2)',
    housingEvaluate: {
      ok: housingEvaluate.ok,
      featureCount: housingEvaluate.featureCount,
      featureHealth: housingEvaluate.featureHealth,
    },
    mechanismEvaluate: {
      ok: mechanismEvaluate.ok,
      featureCount: mechanismEvaluate.featureCount,
      mechanism: mechanismEvaluate.mechanism,
      parts: mechanismEvaluate.parts,
      diagnostics: mechanismEvaluate.diagnostics,
      featureHealth: mechanismEvaluate.featureHealth,
    },
    housingDesignLoop: {
      ok: housingDesignLoop.ok,
      functional: housingDesignLoop.attempts[0]?.functional,
      passedChecks: housingDesignLoop.attempts[0]?.passedChecks,
      blockingReasons: housingDesignLoop.attempts[0]?.blockingReasons,
      reviewFacts: housingDesignLoop.attempts[0]?.reviewFacts?.map((f) => f.code),
    },
    mechanismDesignLoop: {
      ok: mechanismDesignLoop.ok,
      functional: mechanismDesignLoop.attempts[0]?.functional,
      reviewFacts: mechanismDesignLoop.attempts[0]?.reviewFacts?.map((f) => f.code),
      blockingReasons: mechanismDesignLoop.attempts[0]?.blockingReasons,
      passedChecks: mechanismDesignLoop.attempts[0]?.passedChecks,
      mechanismSummary: mechanismDesignLoop.attempts[0]?.mechanismSummary,
      note: mechanismDesignLoop.ok
        ? 'evaluate+mechanism:real OK; design_loop green (joint-support / grounded-root / gravity-hold)'
        : 'design_loop still failing — see blockingReasons / reviewFacts',
    },
    toyFailClosed: {
      ok: toyFailClosed.ok,
      reviewFacts: toyFailClosed.attempts[0]?.reviewFacts?.map((f) => f.code),
      revisionAssistMode: toyFailClosed.revisionAssist?.mode,
    },
    openInStudioMeshCdn: 'not exercised this slice (local evaluate/design_loop only)',
  };

  mkdirSync('docs/agent/smoke', { recursive: true });
  mkdirSync('artifacts/adam-smoke', { recursive: true });
  const json = JSON.stringify(evidence, null, 2) + '\n';
  writeFileSync('docs/agent/smoke/adam-chatgpt-gaps-smoke.json', json);
  writeFileSync('artifacts/adam-smoke/smoke-evidence.json', json);
  console.log(json);

  if (!mechanismDesignLoop.ok) {
    console.error('FAIL: mechanism design_loop not green');
    process.exitCode = 1;
  } else {
    console.error('PASS: mechanism design_loop green');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
