# One-line install for coding agents

Tell your agent: **“look at kernelcad.com and install the mcp”**. The homepage
links [llms.txt](https://kernelcad.com/llms.txt), which gives supported host setup
and a read-only connection check.

For local npm use, pick one published `kernelcad` version and use it for both
the MCP server and `kernelcad skill install`. The package bundles
`dist/cli/skills/kernelcad/SKILL.md` and the specialty tree; each packaged
`SKILL.md` has `metadata.version` stamped from `package.json.version` during
`build:cli` / `prepack`. Source skills are not manually versioned. Hosted
plugins follow the hosted service rather than a local npm version.

kernelCAD ships as a plugin for Claude Code, Codex, Cursor, Gemini CLI and Grok
Build. Every manifest points at the hosted MCP server
`https://mcp.kernelcad.com/mcp` (streamable HTTP). The server works anonymously
and also offers OAuth (dynamic client registration at
`https://mcp.kernelcad.com/reg`) for signed-in features, so clients show their
own sign-in prompt when a tool needs it. No local OpenCASCADE, Node or Python
install is needed.

The plugin bundles four skills: `kernelcad-design-loop`, `kernelcad-cookbooks`,
`kernelcad-studio-paint` and `kernelcad-export`.

## Already in ChatGPT and Claude: no install

kernelCAD runs as a connected app in **ChatGPT** (Apps SDK, with the Studio
viewer and paint review inside the chat) and in **Claude / claude.ai** (custom
connector). Add it from the chat settings and sign in:

- ChatGPT: [connect guide](https://app.kernelcad.com/connect?client=chatgpt) or [ChatGPT → Settings → Connectors](https://chatgpt.com/#settings/Connectors)
- Claude: [connect guide](https://app.kernelcad.com/connect?client=claude) or [claude.ai → Settings → Connectors](https://claude.ai/settings/connectors), URL `https://mcp.kernelcad.com/mcp`

**One account everywhere.** The coding-agent plugins below use the same hosted
server (`https://mcp.kernelcad.com/mcp`) and the same kernelCAD sign-in. A model
saved from Claude Code, Codex, Cursor, Gemini or Grok opens at the same Studio
share link (`/p/<slug>`) you see in ChatGPT or Claude. Sign in with the same
account in each client.

Signing in: anonymous use works with no prompt. To save models to your account,
accept the OAuth prompt your client shows for `kernelcad` (Claude Code: `/mcp`,
then authenticate; Codex: `codex mcp login kernelcad`; Gemini: `/mcp auth kernelcad`).

## Claude Code

```bash
claude plugin install kernelcad --marketplace w1ne/kernelCAD-web
```

Needs Claude Code 2.1.275 or later. On older versions:

```bash
claude plugin marketplace add w1ne/kernelCAD-web
claude plugin install kernelcad@kernelcad
```

Update: `claude plugin marketplace update kernelcad && claude plugin update kernelcad@kernelcad`.
Remove: `claude plugin uninstall kernelcad@kernelcad && claude plugin marketplace remove kernelcad`.

## Codex

```bash
codex plugin marketplace add w1ne/kernelCAD-web && codex plugin add kernelcad@kernelcad
```

Update: `codex plugin marketplace upgrade kernelcad`. Remove:
`codex plugin remove kernelcad@kernelcad && codex plugin marketplace remove kernelcad`.
Listing in the public ChatGPT/Codex plugin directory needs a submission through
OpenAI's plugin portal.

## Cursor

MCP server only, one click:
[Add kernelCAD to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=kernelcad&config=eyJ1cmwiOiJodHRwczovL21jcC5rZXJuZWxjYWQuY29tL21jcCJ9).
The link carries `{"url":"https://mcp.kernelcad.com/mcp"}` in base64.

MCP server and skills, as a local plugin (Cursor reads `.cursor-plugin/plugin.json`):

```bash
git clone --depth 1 https://github.com/w1ne/kernelCAD-web /tmp/kcad && cp -R /tmp/kcad/plugins/kernelcad ~/.cursor/plugins/local/kernelcad && rm -rf /tmp/kcad
```

Cursor also loads the Claude Code plugin, so if that is installed, skip this.
Teams can import the repo under Dashboard → Plugins & MCPs → Team Marketplaces.

## Gemini CLI

```bash
gemini extensions install https://github.com/w1ne/kernelCAD-web --consent --auto-update
```

Update: `gemini extensions update kernelcad`. Remove: `gemini extensions uninstall kernelcad`.

## Grok Build

```bash
grok plugin marketplace add w1ne/kernelCAD-web && grok plugin install kernelcad --trust
```

Grok Build reads `.claude-plugin/marketplace.json`. `--trust` is required to
activate the MCP server and skills. Listing in the built-in marketplace needs a
PR to `xai-org/plugin-marketplace`.

## Other clients

Any MCP client that speaks streamable HTTP can use `https://mcp.kernelcad.com/mcp`.

### Skills only (skills.sh, any agent)

```bash
npx skills add w1ne/kernelCAD-web
```

Installs the four skills for the agents you pick (`-g -a -y` skips the
questions). Pair it with one of the MCP lines below.

### MCP only, one command

| Client | Command or link |
|---|---|
| Claude Code | `claude mcp add --transport http kernelcad https://mcp.kernelcad.com/mcp` |
| Codex | `codex mcp add kernelcad --url https://mcp.kernelcad.com/mcp` |
| Gemini CLI | `gemini mcp add -s user --transport http kernelcad https://mcp.kernelcad.com/mcp` |
| VS Code / GitHub Copilot | `code --add-mcp '{"name":"kernelcad","type":"http","url":"https://mcp.kernelcad.com/mcp"}'` or [Install in VS Code](https://insiders.vscode.dev/redirect/mcp/install?name=kernelcad&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.kernelcad.com%2Fmcp%22%7D) |
| Cursor | [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=kernelcad&config=eyJ1cmwiOiJodHRwczovL21jcC5rZXJuZWxjYWQuY29tL21jcCJ9) |

### Config snippets

Claude Desktop and claude.ai: Settings → Connectors → Add custom connector, URL
`https://mcp.kernelcad.com/mcp`. Local stdio alternative:
`kernelcad install --claude-desktop`.

Windsurf (`~/.codeium/windsurf/mcp_config.json`):

```json
{ "mcpServers": { "kernelcad": { "serverUrl": "https://mcp.kernelcad.com/mcp" } } }
```

Cline (`cline_mcp_settings.json`):

```json
{ "mcpServers": { "kernelcad": { "type": "streamableHttp", "url": "https://mcp.kernelcad.com/mcp" } } }
```

Zed (`settings.json`):

```json
{ "context_servers": { "kernelcad": { "url": "https://mcp.kernelcad.com/mcp" } } }
```

Continue (`.continue/mcpServers/kernelcad.yaml`):

```yaml
name: kernelcad
version: 0.0.1
schema: v1
mcpServers:
  - name: kernelcad
    type: streamable-http
    url: https://mcp.kernelcad.com/mcp
```

Local stdio server for any client (bundled WASM kernel, no OCCT install):
`kernelcad mcp`.

### Registries

- Official MCP registry: `com.kernelcad/kernelcad` (from `server.json`).
- Smithery, Glama, mcp.so: submission is per-account; see the PR description.

## Coverage compared with text-to-cad

| Channel | text-to-cad | kernelCAD |
|---|---|---|
| ChatGPT app with in-chat Studio viewer and paint review | no | yes, live |
| Claude / claude.ai connector | no | yes, live |
| One account and share links across chat apps and coding agents | no | yes |
| Claude Code plugin marketplace | yes | yes |
| Codex marketplace CLI | yes | yes |
| Codex / ChatGPT public plugin directory | listed | needs submission |
| Agent Plugins portable `plugin.json` + `mcp.json` | yes | yes |
| Cursor local plugin (`.cursor-plugin`) | yes | yes |
| Cursor one-click MCP deeplink | no | yes |
| Cursor Marketplace / Team Marketplace | yes | Team import works; public listing needs submission |
| Grok Build | yes | yes |
| Gemini CLI extension | yes | yes |
| skills.sh (`npx skills add`) | yes | yes |
| Claude Desktop | manual JSON (uvx) | custom connector URL, or `kernelcad install --claude-desktop` |
| Package manager runtime | PyPI `cadgen` via uvx | npm `kernelcad` via npx |
| Hosted remote MCP (no local install) | no | yes |
| VS Code / Copilot one-click and `code --add-mcp` | no | yes |
| ChatGPT connector (developer mode) | no | yes |
| Windsurf, Cline, Zed, Continue | no | snippets |
| Official MCP registry | no | listed |
| Smithery / Glama / mcp.so | no | needs account submission |
| Docker image | no | no |

## Layout

| File | Read by |
|---|---|
| `agent-plugin.config.json` | Source of truth; all files below are generated from it |
| `.claude-plugin/marketplace.json` | Claude Code, Grok Build, Codex (compat) |
| `.agents/plugins/marketplace.json` | Codex / ChatGPT |
| `plugins/kernelcad/.claude-plugin/plugin.json` | Claude Code, Grok Build |
| `plugins/kernelcad/plugin.json` + `mcp.json` | Codex / ChatGPT (Agent Plugins format) |
| `plugins/kernelcad/.cursor-plugin/plugin.json` | Cursor |
| `gemini-extension.json` (+ `skills` symlink) | Gemini CLI |
| `skills.sh.json` | skills.sh listing |
| `plugins/kernelcad/skills/*/SKILL.md` | all platforms with skills |

The plugin lives in `plugins/kernelcad/` so Claude Code and Codex copy only that
folder, not the whole repository. Gemini installs from the repo root, so the root
`skills` symlink points at the same skills.

## Reusing this for another product

1. Copy `agent-plugin.config.json` and `scripts/agentPlugin/` into the product repo.
2. Edit the config: `name`, `marketplaceName`, `displayName`, `repo`,
   `description`, `mcp.url`, `mcp.auth` (`none`, `oauth`, `mixed` or `api_key`),
   `pluginDir`, `geminiContextFile`.
3. Write skills under `<pluginDir>/skills/<skill>/SKILL.md` and a short
   `GEMINI.md`, then `ln -s <pluginDir>/skills skills`.
4. Run `node scripts/agentPlugin/buildManifests.mjs` and commit the output.
   The script prints the Cursor deeplink. `--check` fails when a manifest is stale.
5. Check with `claude plugin validate .` and `gemini extensions validate .`.

The product needs a public HTTPS MCP endpoint. A stdio-only server does not fit
this template.
