// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import React, { useMemo, useState } from 'react';
import { createMcpToken } from '../funnel/lib/apiClient';

/**
 * Agent connection surface. The npm package is the portable MCP/token/tooling
 * shim; hosted cloud kernels and Studio-aware sessions sit behind it.
 */
export const AgentActivityLog: React.FC = () => {
    const [copied, setCopied] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [isMinting, setIsMinting] = useState(false);

    const handleGenerateToken = async () => {
        setIsMinting(true);
        setTokenError(null);
        try {
            const result = await createMcpToken();
            setToken(result.token);
        } catch (err: unknown) {
            setToken(null);
            setTokenError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsMinting(false);
        }
    };

    const copyCommand = async (id: string, command: string) => {
        await navigator.clipboard.writeText(command);
        setCopied(id);
        window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1200);
    };

    const tokenArg = token ?? '<click Generate to mint a token>';
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
                        ? 'Token ready. Copy a command below. Generating again issues a fresh token; previous tokens stay valid.'
                        : tokenError
                            ? 'Sign in to mint a cloud MCP token, then click Generate.'
                            : isMinting
                                ? 'Minting cloud MCP token...'
                                : 'Click Generate to mint a token, then copy a command below.'}
                </div>
                <div className="mt-3">
                    <button
                        type="button"
                        onClick={() => void handleGenerateToken()}
                        disabled={isMinting}
                        aria-label={token ? 'Generate a new cloud MCP token' : 'Generate a cloud MCP token'}
                        className="rounded border border-[#3a3a3a] px-2 py-1 text-[11px] text-gray-200 hover:bg-[#222] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isMinting ? 'Minting…' : token ? 'Generate new token' : 'Generate token'}
                    </button>
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
                                    disabled={!token}
                                    title={token ? undefined : 'Generate a token first'}
                                    className="rounded border border-[#3a3a3a] px-2 py-0.5 text-[10px] text-gray-300 hover:bg-[#222] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-gray-300"
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
