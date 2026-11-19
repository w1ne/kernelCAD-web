// Production-like run: one forked child with the vendor evaluator Node flags,
// evaluate_script then export stl, RSS sampled from /proc/<pid>/statm every 250 ms.
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const [root, label, src, outJson] = process.argv.slice(2);
const CAP = 1024, HEAP = 768;
const code = src.startsWith('inline:') ? readFileSync(src.slice(7), 'utf8') : null;
const file = code === null ? resolve(root, src) : null;
const child = fork(new URL('./child.mjs', import.meta.url), [], {
  cwd: root,
  env: { ...process.env, KERNELCAD_MCP_MODE: 'hosted', KC_BUNDLE: resolve(root, '.tmp-eval1585/mcp/toolRegistry.js') },
  stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  execArgv: [`--max-old-space-size=${process.env.KC_HEAP ?? HEAP}`, ...(process.env.KC_EXTRA ? process.env.KC_EXTRA.split(' ') : []), '--no-wasm-tier-up', '--no-wasm-dynamic-tiering'],
});
let peak = 0, phasePeak = 0;
const rss = () => { try { return Number(readFileSync(`/proc/${child.pid}/statm`, 'utf8').split(' ')[1]) * 4096 / 1048576; } catch { return 0; } };
const timer = setInterval(() => { const mb = rss(); peak = Math.max(peak, mb); phasePeak = Math.max(phasePeak, mb); }, 250);
let id = 0; const pending = new Map();
child.on('message', (m) => pending.get(m.id)?.(m)); child.on('error', () => {});
let exited = null; child.on('exit', (c, s) => { exited = { c, s }; for (const r of pending.values()) r({ ok: false, error: `child exit ${c} ${s}` }); });
const call = (name, args) => new Promise((res) => { const i = ++id; pending.set(i, res); if (exited) return res({ ok: false, error: 'child gone' }); child.send({ id: i, name, args }, () => {}); });
const phase = async (name, args) => {
  phasePeak = rss(); const t0 = Date.now();
  const r = await call(name, args);
  console.error(`[phase] ${name} done peak=${Math.round(phasePeak)} MB ok=${r.ok} exited=${JSON.stringify(exited)} t=${Date.now()-t0}ms`);
  const end = rss(); phasePeak = Math.max(phasePeak, end); peak = Math.max(peak, end);
  return { r, sampledPeakMb: Math.round(phasePeak), endRssMb: Math.round(end), hwmMb: Math.round(r.hwmMb ?? 0), seconds: Number(((Date.now() - t0) / 1000).toFixed(1)) };
};
const dir = mkdtempSync(join(tmpdir(), 'kc1585-'));
const outPath = join(dir, 'out.stl');
const input = code === null ? { file } : { code };
const load = await phase('__load', {});
const evaluate = process.env.SKIP_EVAL ? load : await phase('evaluate_script', input);
const exp = await phase('export', { target: 'model', ...input, output_path: outPath, format: 'stl' });
clearInterval(timer);
const pick = (p) => ({ sampledPeakMb: p.sampledPeakMb, hwmMb: p.hwmMb, endRssMb: p.endRssMb, seconds: p.seconds, ok: p.r.ok && p.r.value?.ok !== false, error: p.r.error });
const rec = { label, source: src, heapCapMb: HEAP, rssCapMb: CAP, load: pick(load), evaluate: pick(evaluate), export: pick(exp) };
const ev = evaluate.r.value, ex = exp.r.value;
rec.evaluateOk = ev?.ok; rec.exportOk = ex?.ok;
rec.exportErrorCodes = (ex?.diagnostics ?? []).filter(d => d.severity === 'error').map(d => d.code);
rec.exportWarnCodes = (ex?.diagnostics ?? []).filter(d => d.severity === 'warn').map(d => d.code);
try {
  const b = readFileSync(outPath);
  rec.stlBytes = b.length; rec.headerTriangles = b.readUInt32LE(80); rec.triangles = (b.length - 84) / 50;
  rec.triangleDataSha256 = createHash('sha256').update(b.subarray(80)).digest('hex');
} catch (e) { rec.stlError = String(e); }
rec.peakHwmMb = Math.max(load.hwmMb, evaluate.hwmMb, exp.hwmMb);
rec.peakSampledMb = Math.round(peak);
rec.underCap = rec.peakHwmMb <= CAP;
writeFileSync(outJson, JSON.stringify(rec, null, 1) + '\n');
console.log(JSON.stringify(rec));
child.disconnect(); setTimeout(() => process.exit(0), 500);
