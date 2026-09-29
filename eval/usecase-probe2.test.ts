import { it } from 'vitest';
import harness from './tasks/usecase-bolt-nut/harness';
it('bolt', async () => {
  const t = Date.now();
  const r = await harness('eval/tasks/usecase-bolt-nut/solution-expert.kcad.ts');
  console.log('##', Date.now() - t, JSON.stringify(r));
}, 3600000);
