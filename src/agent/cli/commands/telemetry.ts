// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/telemetry.ts
//
// `kernelcad telemetry status|enable|disable|reset` — manage anonymous
// usage telemetry. See TELEMETRY.md for exactly what is collected.
import { Command } from 'commander';
import { randomUUID } from 'node:crypto';
import {
  loadConfig, saveConfig, ensureInstallId, isTelemetryEnabled,
} from '../../../shared/telemetry/config';

function setEnabled(enabled: boolean): void {
  const cfg = loadConfig();
  saveConfig({ enabled, installId: cfg?.installId ?? ensureInstallId(), notified: true });
}

export function telemetryCommand(): Command {
  const cmd = new Command('telemetry').description('Manage anonymous usage telemetry');

  cmd.command('status').description('Show whether telemetry is enabled').action(() => {
    const cfg = loadConfig();
    console.log(`telemetry: ${isTelemetryEnabled() ? 'enabled' : 'disabled'}`);
    console.log(`install id: ${cfg?.installId ?? '(none yet)'}`);
    console.log('details: see TELEMETRY.md');
  });

  cmd.command('enable').description('Enable anonymous telemetry').action(() => {
    setEnabled(true);
    console.log('Anonymous telemetry enabled. Thank you — this helps improve kernelCAD.');
  });

  cmd.command('disable').description('Disable anonymous telemetry').action(() => {
    setEnabled(false);
    console.log('Anonymous telemetry disabled. No usage data will be sent.');
  });

  cmd.command('reset').description('Forget the local install id and re-enable').action(() => {
    saveConfig({ enabled: true, installId: randomUUID(), notified: true });
    console.log('Telemetry state reset; a new anonymous install id was generated.');
  });

  return cmd;
}
