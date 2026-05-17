import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

describe('Cloudflare Pages deploy workflow', () => {
  it('deploys the Studio dist/ bundle to kernelcad-marketing (so kernelcad.com serves the prompt funnel)', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    const marketingSteps = workflow.jobs.marketing.steps as Array<{
      name?: string;
      with?: { command?: string; workingDirectory?: string };
    }>;

    const deployStep = marketingSteps.find((step) =>
      step.name?.includes('Deploy to Cloudflare Pages'),
    );

    // After hotfix: deploy runs from repo root and uploads dist/ (which gets
    // site/functions and site/public overlaid by the preceding step). The old
    // site-as-workingDirectory shape served a static landing without the
    // prompt funnel.
    expect(deployStep?.with?.command).toBe(
      'pages deploy dist --project-name=kernelcad-marketing --branch=main --commit-dirty=true',
    );
  });

  it('passes VITE_SUPABASE_* secrets to both Vite build jobs (otherwise supabaseClient throws on bundle load)', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    for (const jobName of ['marketing', 'app'] as const) {
      const steps = workflow.jobs[jobName].steps as Array<{
        name?: string;
        env?: Record<string, string>;
        run?: string;
      }>;
      const buildStep = steps.find((s) => s.run?.includes('npm run build'));
      expect(buildStep, `${jobName}: vite build step exists`).toBeDefined();
      expect(buildStep?.env?.VITE_SUPABASE_URL, `${jobName}: VITE_SUPABASE_URL`).toMatch(/secrets\.VITE_SUPABASE_URL/);
      expect(buildStep?.env?.VITE_SUPABASE_ANON_KEY, `${jobName}: VITE_SUPABASE_ANON_KEY`).toMatch(/secrets\.VITE_SUPABASE_ANON_KEY/);
    }
  });
});
