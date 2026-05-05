import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

describe('Cloudflare Pages deploy workflow', () => {
  it('runs the marketing Pages deploy from site/ so Pages Functions and wrangler.toml are discovered', () => {
    const workflow = YAML.parse(readFileSync('.github/workflows/deploy-cloudflare.yml', 'utf8'));
    const marketingSteps = workflow.jobs.marketing.steps as Array<{
      name?: string;
      with?: { command?: string };
    }>;

    const deployStep = marketingSteps.find((step) =>
      step.name?.includes('Deploy to Cloudflare Pages'),
    );

    expect(deployStep?.with?.command).toBe(
      'pages deploy . --cwd=site --project-name=kernelcad-marketing --branch=main --commit-dirty=true',
    );
  });
});
