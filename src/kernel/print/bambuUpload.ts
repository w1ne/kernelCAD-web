// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/print/bambuUpload.ts
//
// Real Bambu Lab LAN-mode upload: implicit-TLS FTPS on port 990 (user
// `bblp`, password = the printer's LAN access code — Bambu's own
// documented LAN Mode protocol) uploads the print file into the printer's
// SD card storage, then an MQTT `print.project_file` command on port
// 8883 (same TLS client cert model as Bambu Studio/OrcaSlicer's own LAN
// send-to-printer flow) starts the print. The print file is a `.gcode.3mf`
// (the model 3MF when given, plus `Metadata/plate_1.gcode`; see
// `bambuPrintFile.ts`), because `project_file` prints a 3MF project.

import { Client as FtpClient } from 'basic-ftp';
import mqtt from 'mqtt';
import { Readable } from 'node:stream';
import type { UploadOutcome, UploadRequest } from './types';
import { bambuPrintFileName, buildBambuPrintFile } from './bambuPrintFile';

const FTPS_PORT = 990;
const MQTT_PORT = 8883;

async function ftpsUpload(req: UploadRequest, filename: string, bytes: Uint8Array): Promise<UploadOutcome> {
  const client = new FtpClient(15_000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: req.host,
      port: FTPS_PORT,
      user: 'bblp',
      password: req.accessCode ?? '',
      secure: 'implicit',
      secureOptions: { rejectUnauthorized: false },
    });
    if (req.dryRun) {
      return { ok: true, dryRun: true };
    }
    await client.uploadFrom(Readable.from(Buffer.from(bytes)), filename);
    return { ok: true, uploadedPath: filename };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const kind = /ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND/.test(message) ? 'unreachable' as const : 'upload-failed' as const;
    return { ok: false, kind, message: `Bambu FTPS ${req.dryRun ? 'connectivity check' : 'upload'} failed: ${message}` };
  } finally {
    client.close();
  }
}

/** Build the MQTT `print.project_file` payload Bambu Studio/OrcaSlicer's
 *  own LAN "send to printer" action publishes to start a print from a
 *  file already on the printer's SD card. Exported for a network-free
 *  unit test of the payload shape. */
export function buildPrintProjectFileCommand(filename: string, sequenceId = 0): Record<string, unknown> {
  return {
    print: {
      sequence_id: String(sequenceId),
      command: 'project_file',
      param: `Metadata/plate_1.gcode`,
      subtask_name: filename,
      url: `file:///sdcard/${filename}`,
      bed_type: 'auto',
      timelapse: false,
      bed_leveling: true,
      flow_cali: false,
      vibration_cali: false,
      layer_inspect: false,
      use_ams: false,
    },
  };
}

async function mqttStartPrint(req: UploadRequest, filename: string): Promise<UploadOutcome> {
  const url = `mqtts://${req.host}:${MQTT_PORT}`;
  let client: mqtt.MqttClient;
  try {
    client = await new Promise<mqtt.MqttClient>((resolve, reject) => {
      const c = mqtt.connect(url, {
        username: 'bblp',
        password: req.accessCode ?? '',
        rejectUnauthorized: false,
        connectTimeout: 10_000,
        reconnectPeriod: 0,
      });
      c.once('connect', () => resolve(c));
      c.once('error', (err) => reject(err));
    });
  } catch (e) {
    return { ok: false, kind: 'unreachable', message: `Bambu MQTT connect failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  try {
    if (req.dryRun) {
      return { ok: true, dryRun: true };
    }
    const topic = `device/${req.serial}/request`;
    const payload = JSON.stringify(buildPrintProjectFileCommand(filename));
    await new Promise<void>((resolve, reject) => {
      client.publish(topic, payload, { qos: 1 }, (err) => (err ? reject(err) : resolve()));
    });
    return { ok: true, uploadedPath: filename };
  } catch (e) {
    return { ok: false, kind: 'upload-failed', message: `Bambu MQTT print-start command failed: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    client.end(true);
  }
}

/**
 * Bambu Lab LAN-mode send-to-printer: FTPS upload followed by an MQTT
 * print-start command. `dryRun` validates both connections without
 * uploading or starting a print.
 */
export async function uploadToBambu(req: UploadRequest): Promise<UploadOutcome> {
  if (!req.accessCode) {
    return { ok: false, kind: 'unreachable', message: 'Bambu LAN mode requires accessCode (printer settings -> LAN Only Mode -> Access Code).' };
  }
  const filename = bambuPrintFileName(req.filename);
  let printFile: Uint8Array;
  try {
    printFile = buildBambuPrintFile(req.gcode, req.model3mf);
  } catch (e) {
    return { ok: false, kind: 'upload-failed', message: `Bambu print file: ${e instanceof Error ? e.message : String(e)}` };
  }

  const ftpsResult = await ftpsUpload(req, filename, printFile);
  if (!ftpsResult.ok) return ftpsResult;

  if (req.startPrint === false) return ftpsResult;
  if (!req.serial) {
    return { ok: false, kind: 'upload-failed', message: 'Bambu print-start requires serial (the printer serial number); pass startPrint: false to upload without starting.' };
  }

  return mqttStartPrint(req, filename);
}
