// Production-like run: one forked child with the vendor evaluator Node flags
// runs evaluate_script; RSS is sampled from /proc/<pid>/statm every 250 ms.
//   node evaluate.mjs <repo root> <script> [result.json]
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [root, src, outJson] = process.argv.slice(2);
const HEAP = Number(process.env.KC_HEAP ?? 768), CAP = 1024;
const child = fork(new URL('./child.mjs', import.meta.url), [], {
  cwd: root,
  env: { ...process.env, KERNELCAD_MCP_MODE: 'hosted', KC_BUNDLE: resolve(root, '.tmp-eval-rest-overlap/mcp/toolRegistry.js') },
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  execArgv: [`--max-old-space-size=${HEAP}`, '--no-wasm-tier-up', '--no-wasm-dynamic-tiering'],
});
let peak = 0;
const t0 = Date.now();
const rss = () => { try { return Number(readFileSync(`/proc/${child.pid}/statm`, 'utf8').split(' ')[1]) * 4096 / 1048576; } catch { return 0; } };
const timer = setInterval(() => { peak = Math.max(peak, rss()); }, 250);
const finish = (rec) => {
  clearInterval(timer);
  const out = { source: src, heapCapMb: HEAP, rssCapMb: CAP, seconds: Number(((Date.now() - t0) / 1000).toFixed(1)), sampledPeakRssMb: Math.round(peak), ...rec };
  if (outJson) writeFileSync(outJson, JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out));
  process.exit(0);
};
child.on('exit', (code, signal) => finish({ completed: false, exitCode: code, signal }));
child.on('message', (m) => {
  const v = m.value;
  const diagnostics = (v?.diagnostics ?? []).map((d) => [d.severity, d.code, d.message]);
  finish({
    completed: m.ok, error: m.error, peakRssMb: Math.round(m.hwmMb), underCap: m.hwmMb <= CAP,
    evaluateOk: v?.ok, parts: v?.parts?.count, mechanism: v?.mechanism, diagnosticCount: diagnostics.length,
    diagnosticsSha256: createHash('sha256').update(JSON.stringify(diagnostics)).digest('hex'),
  });
});
child.send({ id: 1, name: 'evaluate_script', args: { file: resolve(root, src) } });
