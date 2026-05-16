#!/usr/bin/env node
import { loadSnippets } from '../src/agent/cookbook/index';

try {
  const snippets = loadSnippets();
  console.log(`✓ ${snippets.length} cookbook snippet(s) validated`);
  for (const s of snippets) {
    console.log(`  ${s.id} (${s.tags.length} tags, ${s.keywords.length} keywords, ${s.body.length} body chars)`);
  }
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`✗ cookbook validation failed:\n  ${msg}`);
  process.exit(1);
}
