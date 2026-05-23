// eval/dist-skills/bracket-prompt/runClaudeCode.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const prompt = readFileSync(new URL('./prompt.md', import.meta.url), 'utf8');
const r = spawnSync('claude', ['--print', prompt], {
  stdio: 'inherit',
  timeout: 25 * 60 * 1000,
});
if (r.status !== 0) {
  console.error('claude exited non-zero');
  process.exit(1);
}
if (!existsSync('bracket.step')) {
  console.error('bracket.step missing');
  process.exit(2);
}
const validate = spawnSync('kernelcad', ['validate', 'bracket.kcad.ts'], {
  stdio: 'inherit',
});
if (validate.status !== 0) {
  console.error('kernelcad validate failed');
  process.exit(3);
}
console.log('OK: claude-code shipped a valid STEP.');
