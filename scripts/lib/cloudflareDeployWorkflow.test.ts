// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

describe('Cloudflare Pages deploy workflow', () => {
  it('does not deploy kernelcad.com from the public kernelCAD-web workflow', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    expect(Object.keys(workflow.jobs)).not.toContain('marketing');
    expect(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8')).not.toContain(
      '--project-name=kernelcad-marketing',
    );
  });

  it('keeps app.kernelcad.com deployed from the public workflow', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    const appSteps = workflow.jobs.app.steps as Array<{
      name?: string;
      with?: { command?: string; workingDirectory?: string };
    }>;

    const deployStep = appSteps.find((step) =>
      step.name?.includes('Deploy to Cloudflare Pages'),
    );

    expect(deployStep?.with?.wranglerVersion).toBe('4.94.0');
    expect(deployStep?.with?.command).toBe(
      'pages deploy dist --project-name=kernelcad-app --branch=main --commit-dirty=true --skip-caching',
    );
  });

  it('passes VITE_SUPABASE_* secrets to the Vite build job (otherwise supabaseClient throws on bundle load)', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    for (const jobName of ['app'] as const) {
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
