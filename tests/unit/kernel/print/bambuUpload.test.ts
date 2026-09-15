// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Bambu Lab LAN-mode: the MQTT print-start payload builder is a pure
// function tested without any network. The FTPS/MQTT connections
// themselves need a real (or LAN-simulated) Bambu printer, so that path
// is exercised only when KERNELCAD_TEST_BAMBU_HOST is set (skipped
// otherwise — no fake network success is ever asserted).
import { describe, it, expect } from 'vitest';
import { buildPrintProjectFileCommand, uploadToBambu } from '../../../../src/kernel/print/bambuUpload';

describe('buildPrintProjectFileCommand', () => {
  it('builds the project_file MQTT command referencing the uploaded file', () => {
    const cmd = buildPrintProjectFileCommand('kernelcad.gcode', 7);
    expect(cmd).toEqual({
      print: expect.objectContaining({
        sequence_id: '7',
        command: 'project_file',
        subtask_name: 'kernelcad.gcode',
        url: 'file:///sdcard/kernelcad.gcode',
      }),
    });
  });

  it('defaults sequence_id to "0"', () => {
    const cmd = buildPrintProjectFileCommand('x.gcode');
    expect((cmd.print as Record<string, unknown>).sequence_id).toBe('0');
  });
});

describe('uploadToBambu — argument validation (no network)', () => {
  it('fails closed when accessCode is missing', async () => {
    const result = await uploadToBambu({
      protocol: 'bambu-lan', host: '127.0.0.1', gcode: new Uint8Array([1]),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('unreachable');
      expect(result.message).toMatch(/accessCode/);
    }
  });
});

const bambuHost = process.env.KERNELCAD_TEST_BAMBU_HOST;
describe.skipIf(!bambuHost)('uploadToBambu — live printer (opt-in)', () => {
  it('dry run connects over FTPS and MQTT without uploading', async () => {
    const result = await uploadToBambu({
      protocol: 'bambu-lan',
      host: bambuHost!,
      accessCode: process.env.KERNELCAD_TEST_BAMBU_ACCESS_CODE ?? '',
      serial: process.env.KERNELCAD_TEST_BAMBU_SERIAL,
      gcode: new Uint8Array([1, 2, 3]),
      dryRun: true,
    });
    expect(result.ok).toBe(true);
  }, 30000);
});
