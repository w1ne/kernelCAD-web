import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export interface TelemetryConfig {
  enabled: boolean;
  installId: string;
  notified: boolean;
}

/** Config home honours XDG; `KERNELCAD_CONFIG_HOME` overrides (test seam). */
function configHome(): string {
  return (
    process.env.KERNELCAD_CONFIG_HOME ??
    process.env.XDG_CONFIG_HOME ??
    join(homedir(), '.config')
  );
}

export function configPath(): string {
  return join(configHome(), 'kernelcad', 'telemetry.json');
}

export function loadConfig(): TelemetryConfig | null {
  try {
    if (!existsSync(configPath())) return null;
    const raw = JSON.parse(readFileSync(configPath(), 'utf8'));
    if (typeof raw?.installId !== 'string') return null;
    return { enabled: raw.enabled !== false, installId: raw.installId, notified: raw.notified === true };
  } catch {
    return null;
  }
}

export function saveConfig(cfg: TelemetryConfig): void {
  try {
    mkdirSync(join(configHome(), 'kernelcad'), { recursive: true });
    writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
  } catch {
    // best-effort; never throw from telemetry
  }
}

export function ensureInstallId(): string {
  const existing = loadConfig();
  if (existing) return existing.installId;
  const cfg: TelemetryConfig = { enabled: true, installId: randomUUID(), notified: false };
  saveConfig(cfg);
  return cfg.installId;
}

function envTrue(v: string | undefined): boolean {
  return v === '1' || v === 'true';
}

/** Default ON. Any single off-switch forces OFF — opt-in cannot override an opt-out signal. */
export function isTelemetryEnabled(): boolean {
  if (process.env.KERNELCAD_TELEMETRY === '0') return false;
  if (envTrue(process.env.KERNELCAD_TELEMETRY_DISABLED)) return false;
  if (envTrue(process.env.DO_NOT_TRACK)) return false;
  if (envTrue(process.env.CI)) return false;
  const cfg = loadConfig();
  if (cfg && cfg.enabled === false) return false;
  return true;
}

export function isDebug(): boolean {
  return process.env.KERNELCAD_TELEMETRY_DEBUG === '1';
}
