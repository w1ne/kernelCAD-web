import React, { useEffect, useMemo, useState } from 'react';
import { createMcpToken } from '../funnel/lib/apiClient';

/**
 * Agent connection surface. The npm package is the portable MCP/token/tooling
 * shim; hosted cloud kernels and Studio-aware sessions sit behind it.
 */
export const AgentActivityLog: React.FC = () => {
    const [copied, setCopied] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        createMcpToken()
            .then((result) => {
                if (!active) return;
                setToken(result.token);
                setTokenError(null);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setToken(null);
                setTokenError(err instanceof Error ? err.message : String(err));
            });
        return () => {
            active = false;
        };
    }, []);

    const copyCommand = async (id: string, command: string) => {
        await navigator.clipboard.writeText(command);
        setCopied(id);
        window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1200);
    };

    const tokenArg = token ?? '<sign-in-required>';
    const commands = useMemo(() => [
        {
            id: 'claude',
            label: 'Claude',
            command: `claude mcp add kernelcad -- npx -y kernelcad mcp --cloud --token ${tokenArg}`,
        },
        {
            id: 'codex',
            label: 'Codex',
            command: `codex mcp add kernelcad -- npx -y kernelcad mcp --cloud --token ${tokenArg}`,
        },
    ], [tokenArg]);

    return (
        <div className="h-full p-3 flex flex-col gap-3 overflow-y-auto">
            <div className="uppercase tracking-wide text-[10px] text-gray-500">
                Agents
            </div>

            <div className="rounded border border-[#2a2e38] bg-[#111] p-3">
                <div className="text-xs font-semibold text-gray-100">
                    Cloud MCP connector
                </div>
                <div className="mt-1 text-[11px] leading-snug text-gray-500">
                    One-line MCP install with token auth, local tooling, and hosted kernel execution.
                </div>
                <div className="mt-2 text-[10px] leading-snug text-gray-500">
                    {token
                        ? 'Token ready. Copy a command below.'
                        : tokenError
                            ? 'Sign in to create a cloud MCP token automatically.'
                            : 'Preparing cloud MCP token...'}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                    {commands.map(({ id, label, command }) => (
                        <div key={id} className="rounded border border-[#2d2d2d] bg-black/40 p-2">
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-gray-300">{label}</span>
                                <button
                                    type="button"
                                    aria-label={`Copy ${label} MCP command`}
                                    onClick={() => void copyCommand(id, command)}
                                    className="rounded border border-[#3a3a3a] px-2 py-0.5 text-[10px] text-gray-300 hover:bg-[#222] hover:text-white"
                                >
                                    {copied === id ? 'copied' : 'copy'}
                                </button>
                            </div>
                            <div className="break-all font-mono text-[10px] leading-snug text-gray-500">
                                {command}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded border border-[#2a2e38] bg-[#0d0d0d] p-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-100">
                        Studio Agent Mode
                    </div>
                    <span className="rounded border border-amber-800/60 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                        cloud
                    </span>
                </div>
                <div className="mt-1 text-[11px] leading-snug text-gray-500">
                    Coming later: paid API-driven Studio sessions with OAuth, live edits, and review/apply flow.
                </div>
            </div>
        </div>
    );
};

export default AgentActivityLog;
