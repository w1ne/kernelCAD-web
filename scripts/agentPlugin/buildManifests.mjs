#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Generates every coding-agent plugin manifest from agent-plugin.config.json.
// Usage: node scripts/agentPlugin/buildManifests.mjs [--check] [--root <dir>]
// --check exits 1 when a committed manifest differs from the generated one.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** ChatGPT / Codex plugin metadata under extensions.com.openai. The review and
 *  publication blocks are emitted only when agent-plugin.config.json carries them. */
export function openaiExtensions(cfg) {
  const c = cfg.chatgpt ?? {};
  const out = {
    interface: {
      displayName: cfg.displayName,
      shortDescription: cfg.shortDescription,
      longDescription: cfg.description,
      developerName: cfg.author.name,
      category: cfg.codexCategory,
      capabilities: ['Read', 'Write'],
      websiteURL: cfg.homepage,
      supportURL: cfg.supportUrl,
      defaultPrompt: cfg.defaultPrompts,
      brandColor: cfg.brandColor,
      ...(c.privacyPolicyUrl ? { privacyPolicyURL: c.privacyPolicyUrl } : {}),
      ...(c.termsOfServiceUrl ? { termsOfServiceURL: c.termsOfServiceUrl } : {}),
      ...(c.logo ? { logo: c.logo } : {}),
      ...(c.composerIcon ? { composerIcon: c.composerIcon } : {}),
    },
  };
  if (c.testCases) {
    // The dashboard wants a { positive, negative } object, and tools_triggered as a
    // comma-separated string ("evaluate_script"), not the config's array form.
    const caseForZip = (testCase) => {
      const tools = Array.isArray(testCase.tools_triggered)
        ? testCase.tools_triggered.join(', ')
        : testCase.tools_triggered;
      return {
        description: testCase.description,
        prompt: testCase.prompt,
        ...(tools ? { tools_triggered: tools } : {}),
        expected_behavior: testCase.expected_behavior,
      };
    };
    out.review = {
      test_cases: {
        positive: c.testCases.positive.map(caseForZip),
        negative: c.testCases.negative.map(caseForZip),
      },
      // Emitted only once the commerce decision is made (see chatgpt.commerceDecision).
      ...(typeof c.commerce === 'boolean' ? { commerce: c.commerce } : {}),
      ...(c.commerceDescription ? { commerce_description: c.commerceDescription } : {}),
    };
  }
  if (c.releaseNotes) out.publication = { release_notes: c.releaseNotes };
  return out;
}

export function buildManifests(cfg, version) {
  const m = cfg.mcp;
  const common = {
    name: cfg.name,
    version,
    description: cfg.description,
    author: cfg.author,
    homepage: cfg.homepage,
    repository: `https://github.com/${cfg.repo}`,
    license: cfg.license,
    keywords: cfg.keywords,
  };
  const files = {};
  // Claude Code (also read by Grok Build and by Cursor when the Claude plugin is installed).
  files[`${cfg.pluginDir}/.claude-plugin/plugin.json`] = {
    ...common,
    skills: cfg.skillsDir,
    mcpServers: { [m.serverName]: { type: 'http', url: m.url } },
  };
  files['.claude-plugin/marketplace.json'] = {
    name: cfg.marketplaceName,
    owner: { name: cfg.author.name, url: cfg.author.url },
    metadata: { description: cfg.shortDescription, version },
    plugins: [
      {
        name: cfg.name,
        source: `./${cfg.pluginDir}`,
        description: cfg.description,
        version,
        author: cfg.author,
        homepage: cfg.homepage,
        repository: common.repository,
        license: cfg.license,
        keywords: cfg.keywords,
        category: cfg.category.toLowerCase(),
      },
    ],
  };
  // Portable Agent Plugins package (Codex / ChatGPT), root plugin.json + mcp.json.
  files[`${cfg.pluginDir}/plugin.json`] = {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    ...common,
    extensions: {
      'com.openai': openaiExtensions(cfg),
    },
  };
  files[`${cfg.pluginDir}/mcp.json`] = {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: {
      [m.serverName]: {
        type: 'streamable-http',
        url: m.url,
        // No extensions.com.openai.auth: the published agent-plugins.org 1.0.0 mcp schema
        // rejects it (additionalProperties: false). OAuth is found via the server's
        // /.well-known/oauth-protected-resource discovery instead.
      },
    },
  };
  files['.agents/plugins/marketplace.json'] = {
    name: cfg.marketplaceName,
    interface: { displayName: cfg.displayName },
    plugins: [
      {
        name: cfg.name,
        source: { source: 'local', path: `./${cfg.pluginDir}` },
        policy: { installation: 'AVAILABLE', authentication: 'ON_USE' },
        category: cfg.category,
      },
    ],
  };
  // Cursor plugin manifest.
  files[`${cfg.pluginDir}/.cursor-plugin/plugin.json`] = {
    ...common,
    skills: cfg.skillsDir,
    mcpServers: { [m.serverName]: { url: m.url } },
  };
  // Gemini CLI extension.
  files['gemini-extension.json'] = {
    name: cfg.name,
    version,
    description: cfg.description,
    contextFileName: cfg.geminiContextFile,
    mcpServers: { [m.serverName]: { httpUrl: m.url } },
  };
  // skills.sh listing metadata (npx skills add <repo>).
  files['skills.sh.json'] = {
    $schema: 'https://skills.sh/schemas/skills.sh.schema.json',
    notGrouped: 'bottom',
    groupings: [
      {
        title: cfg.displayName,
        description: cfg.shortDescription,
        skills: cfg.skills,
      },
    ],
  };
  return files;
}

/** One-click / one-command install links for MCP-only clients. */
export function installLinks(cfg) {
  const m = cfg.mcp;
  const vscodeCfg = JSON.stringify({ name: m.serverName, type: 'http', url: m.url });
  const cursorCfg = Buffer.from(JSON.stringify({ url: m.url })).toString('base64');
  return {
    cursorDeeplink: cursorDeeplink(cfg),
    cursorWeb: `https://cursor.com/en/install-mcp?name=${encodeURIComponent(m.serverName)}&config=${encodeURIComponent(cursorCfg)}`,
    vscodeDeeplink: `vscode:mcp/install?${encodeURIComponent(vscodeCfg)}`,
    vscodeWeb: `https://insiders.vscode.dev/redirect/mcp/install?name=${encodeURIComponent(m.serverName)}&config=${encodeURIComponent(JSON.stringify({ type: 'http', url: m.url }))}`,
    vscodeCli: `code --add-mcp '${vscodeCfg}'`,
    claudeCodeMcpOnly: `claude mcp add --transport http ${m.serverName} ${m.url}`,
    codexMcpOnly: `codex mcp add ${m.serverName} --url ${m.url}`,
    geminiMcpOnly: `gemini mcp add --transport http ${m.serverName} ${m.url}`,
  };
}

export function cursorDeeplink(cfg) {
  const config = Buffer.from(JSON.stringify({ url: cfg.mcp.url })).toString('base64');
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(cfg.mcp.serverName)}&config=${encodeURIComponent(config)}`;
}

function main() {
  const args = process.argv.slice(2);
  const here = dirname(fileURLToPath(import.meta.url));
  const ri = args.indexOf('--root');
  const root = ri >= 0 ? resolve(args[ri + 1]) : resolve(here, '..', '..');
  const cfg = JSON.parse(readFileSync(join(root, 'agent-plugin.config.json'), 'utf8'));
  const version = JSON.parse(readFileSync(join(root, cfg.versionFrom), 'utf8')).version;
  const files = buildManifests(cfg, version);
  let stale = 0;
  for (const [rel, obj] of Object.entries(files)) {
    const path = join(root, rel);
    const text = JSON.stringify(obj, null, 2) + '\n';
    if (args.includes('--check')) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== text) {
        console.error(`stale: ${rel}`);
        stale++;
      }
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text);
      console.log(`wrote ${rel}`);
    }
  }
  if (!args.includes('--check')) for (const [k, v] of Object.entries(installLinks(cfg))) console.log(`${k}: ${v}`);
  if (stale) {
    console.error('Run: node scripts/agentPlugin/buildManifests.mjs');
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
