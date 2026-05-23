import { useCallback, useMemo, useState } from 'react';
import { createMcpToken, type McpTokenResult } from '../../../funnel/lib/apiClient';

type Platform = 'macos' | 'windows' | 'linux';

interface PlatformInfo {
  id: Platform;
  label: string;
  configPath: string;
  revealHint: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'macos',
    label: 'macOS',
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    revealHint: 'Reveal in Finder: Cmd+Shift+G, paste the path above.',
  },
  {
    id: 'windows',
    label: 'Windows',
    configPath: '%APPDATA%\\Claude\\claude_desktop_config.json',
    revealHint: 'Open Explorer, paste the path above into the address bar.',
  },
  {
    id: 'linux',
    label: 'Linux',
    configPath: '~/.config/Claude/claude_desktop_config.json',
    revealHint: 'Open in your file manager or edit with $EDITOR.',
  },
];

const TOKEN_PLACEHOLDER = '<TOKEN>';

function buildSnippet(token: string | null): string {
  // Token is rendered verbatim only AFTER auth succeeds. Until then the
  // placeholder lets the user preview the snippet shape without leaking
  // anything sensitive.
  const value = token ?? TOKEN_PLACEHOLDER;
  const obj = {
    mcpServers: {
      kernelcad: {
        command: 'npx',
        args: ['-y', 'kernelcad', 'mcp', '--cloud', '--token', value],
      },
    },
  };
  return JSON.stringify(obj, null, 2);
}

interface ConnectClaudeDesktopProps {
  userEmail: string;
}

/**
 * Slice 1A surface: Connect kernelCAD to Claude Desktop. Signed-in users
 * click "Generate config" to mint a fresh hosted-MCP token (POST
 * /api/v1/mcp/tokens). The returned token is stored in component state
 * ONLY — never persisted to localStorage and never logged.
 */
export function ConnectClaudeDesktop({ userEmail }: ConnectClaudeDesktopProps) {
  const [token, setToken] = useState<string | null>(null);
  const [tokenPrefix, setTokenPrefix] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>('macos');

  const snippet = useMemo(() => buildSnippet(token), [token]);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setCopied(false);
    try {
      const result: McpTokenResult = await createMcpToken();
      // Note: we intentionally do NOT log the token. The prefix is safe to
      // display in the UI ("issued kc_xxx…") as confirmation, but the full
      // value lives only in component state until the user copies it.
      setToken(result.token);
      setTokenPrefix(result.tokenPrefix);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setToken(null);
      setTokenPrefix(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) {
      setErr('Clipboard not available in this browser.');
      return;
    }
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }, [snippet]);

  const activePlatform = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <header className="border-b border-rule px-6 py-3 flex items-center justify-between bg-vellum">
        <a
          href="/"
          className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink"
        >
          <svg
            className="w-4 h-4 text-ink"
            viewBox="0 0 84 84"
            fill="none"
            aria-label="kernelCAD"
          >
            <path
              d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z"
              fill="currentColor"
            />
          </svg>
          <span>
            kernel<span className="text-blueprint">CAD</span>
          </span>
        </a>
        <span className="font-mono text-xs text-ink-soft tracking-wide">
          {userEmail}
        </span>
      </header>

      <section className="px-6 py-10 max-w-3xl mx-auto">
        <h1
          data-testid="connect-heading"
          className="font-serif text-3xl font-medium text-ink"
        >
          Connect kernelCAD to Claude Desktop
        </h1>
        <p className="text-ink-soft text-sm mt-2 max-w-xl">
          Generates a hosted MCP token tied to your account. Each click issues a
          new token; previously issued tokens stay valid until you rotate them
          server-side.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            data-testid="connect-generate-button"
            onClick={handleGenerate}
            disabled={busy}
            className="rounded-md bg-blueprint px-4 py-2 font-mono text-xs tracking-wide text-white hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy
              ? 'Generating…'
              : token
                ? 'Generate new token'
                : 'Generate config'}
          </button>
          {tokenPrefix && (
            <span
              data-testid="connect-token-prefix"
              className="font-mono text-[11px] text-ink-faint tracking-wide"
            >
              Issued token: {tokenPrefix}…
            </span>
          )}
        </div>
        {err && (
          <p
            data-testid="connect-error"
            className="text-copper font-mono text-xs mt-3"
          >
            {err}
          </p>
        )}

        {/* Step 1 — copy the config snippet */}
        <ol className="mt-10 space-y-8">
          <li>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-ink-faint">1.</span>
              <h2 className="font-serif text-lg font-medium text-ink">
                Copy the config
              </h2>
            </div>
            <p className="text-ink-soft text-sm mt-1 ml-7">
              The snippet below is what Claude Desktop expects under{' '}
              <code className="font-mono text-xs">mcpServers</code>.
            </p>
            <div className="ml-7 mt-3 rounded-lg border border-rule bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-rule bg-vellum-soft px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                  claude_desktop_config.json
                </span>
                <button
                  type="button"
                  data-testid="connect-copy-button"
                  onClick={handleCopy}
                  disabled={!token}
                  className="rounded border border-rule px-2 py-0.5 font-mono text-[10px] text-ink-soft hover:border-ink hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Copy config snippet"
                >
                  {copied ? 'copied' : 'copy'}
                </button>
              </div>
              <pre
                data-testid="connect-snippet"
                className="px-3 py-3 font-mono text-[11px] leading-snug text-ink whitespace-pre overflow-x-auto"
              >
                {snippet}
              </pre>
            </div>
            {!token && !busy && (
              <p className="ml-7 mt-2 text-ink-faint font-mono text-[11px]">
                Click "Generate config" to fill in the token.
              </p>
            )}
          </li>

          {/* Step 2 — paste into Claude Desktop config */}
          <li>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-ink-faint">2.</span>
              <h2 className="font-serif text-lg font-medium text-ink">
                Paste into Claude Desktop's config file
              </h2>
            </div>
            <p className="text-ink-soft text-sm mt-1 ml-7">
              Open the config file at the path below. If the file already has
              other <code className="font-mono text-xs">mcpServers</code>{' '}
              entries, add the <code className="font-mono text-xs">kernelcad</code>{' '}
              entry alongside them.
            </p>
            <div
              className="ml-7 mt-3 flex gap-1"
              role="tablist"
              aria-label="Operating system"
            >
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={platform === p.id}
                  data-testid={`connect-platform-${p.id}`}
                  onClick={() => setPlatform(p.id)}
                  className={`rounded-t-md px-3 py-1 font-mono text-[11px] tracking-wide border border-rule border-b-0 transition-colors ${
                    platform === p.id
                      ? 'bg-white text-ink'
                      : 'bg-vellum-soft text-ink-soft hover:text-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="ml-7 rounded-b-md rounded-tr-md border border-rule bg-white px-3 py-3">
              <code
                data-testid="connect-config-path"
                className="font-mono text-xs text-ink break-all"
              >
                {activePlatform.configPath}
              </code>
              <p className="text-ink-faint font-mono text-[11px] mt-2">
                {activePlatform.revealHint}
              </p>
            </div>
          </li>

          {/* Step 3 — restart */}
          <li>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-ink-faint">3.</span>
              <h2 className="font-serif text-lg font-medium text-ink">
                Restart Claude Desktop
              </h2>
            </div>
            <p className="text-ink-soft text-sm mt-1 ml-7">
              Quit and reopen Claude Desktop. The{' '}
              <code className="font-mono text-xs">kernelcad</code> server should
              appear in the Tools section of the chat sidebar. Ask Claude to
              "list kernelcad tools" to verify the connection.
            </p>
          </li>
        </ol>

        <p className="mt-12 text-ink-faint font-mono text-[11px] max-w-xl">
          Tokens are sent only to the hosted MCP gateway at api.kernelcad.com.
          They live in this browser tab while you read this page and are erased
          when you reload or close it.
        </p>
      </section>
    </main>
  );
}
