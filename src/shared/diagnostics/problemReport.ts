// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Build a Studio problem report from the current evaluate or export failure.
// The text is sanitized and size-bounded here. The caller opens the issue
// URL itself and downloads the screenshot and design; this module does not
// touch the network or the filesystem.

import { DIAGNOSTIC_CODES } from './registry';

export const PROBLEM_REPORT_REPO = 'w1ne/kernelCAD-web';
export const PROBLEM_REPORT_NEW_ISSUE_URL = 'https://github.com/w1ne/kernelCAD-web/issues/new';

export const MAX_ERROR_CHARS = 2000;
export const MAX_NOTE_CHARS = 2000;
export const MAX_LOG_LINES = 30;
export const MAX_LOG_LINE_CHARS = 240;
export const MAX_DIAGNOSTICS = 24;
export const MAX_DIAGNOSTIC_MESSAGE_CHARS = 300;
export const MAX_DESIGN_CHARS = 48_000;
export const MAX_TITLE_CHARS = 140;
export const MAX_ISSUE_BODY_CHARS = 5000;
export const MAX_ISSUE_URL_CHARS = 7000;
/** Viewport screenshots larger than this are left out of the report. */
export const MAX_SCREENSHOT_BYTES = 4_000_000;

export const REDACTED_EMAIL = '[redacted-email]';
export const REDACTED_TOKEN = '[redacted-token]';
export const REDACTED_PATH = '[redacted-path]';
export const REDACTED_SECRET = '[redacted]';

const TOKEN_PATTERNS: readonly RegExp[] = [
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{8,}\b/g,
  /\bkc_(?:live|test)_[A-Za-z0-9]{8,}\b/g,
  /\bghp_[A-Za-z0-9]{8,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{8,}\b/g,
  /\bgho_[A-Za-z0-9]{8,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{8,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{8,}\b/g,
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}\b/g,
  /\bnpm_[A-Za-z0-9]{8,}\b/g,
  /\bBearer\s+[A-Za-z0-9\-._~+/]{8,}=*/gi,
];

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// `aws_secret_access_key` is listed whole. A bare `secret` match stops at the
// underscore in that name and would leave the value in place.
const ASSIGNMENT = /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|aws_secret_access_key|aws_access_key_id|aws_session_token|secret|password|passwd|pwd|token)\s*[:=]\s*)(?:"[^"\n]*"|'[^'\n]*'|[^\s&]+)/gi;
/** `https://user:pass@host/...` — the userinfo is a credential. The host stays. */
const URL_USERINFO = /\bhttps?:\/\/[^\s/@:]+:[^\s/@]+@/gi;
const QUERY = /\?[^\s#)]+/g;
const FILE_URL = /\bfile:\/\/\S+/gi;
const LOCAL_PATH = /(?:~\/|(?:\/(?:Users|home|tmp|private|var|Volumes|opt|usr\/local))\/)[^\s"'`)<>|;]+|[A-Za-z]:\\(?:Users|home)\\[^\s"'`)<>|;]+/g;
const CODE_TOKEN = /\b[a-z][a-z0-9_-]{0,48}(?:\.[a-z0-9_-]{1,48}){1,6}\b/g;
const STRUCTURED_CODE = /^[a-z][a-z0-9_-]{0,48}(?:\.[a-z0-9_-]{1,48}){0,6}$/;
const VERSION = /^(?:dev|\d+\.\d+\.\d+)$/;
const COMMIT = /^[0-9a-f]{7,40}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type ProblemReportKind = 'evaluate' | 'export' | 'general';
export type ProblemReportScreenshot = 'ready' | 'missing' | 'too-large';

export interface ProblemReportDiagnostic {
  code?: string;
  severity?: string;
  message?: string;
  hint?: string;
}

export interface ProblemReportInput {
  kind?: ProblemReportKind;
  errorMessage?: string | null;
  hint?: string | null;
  diagnostics?: readonly ProblemReportDiagnostic[];
  logLines?: readonly string[];
  appVersion?: string | null;
  commit?: string | null;
  /** Raw user agent. The report stores a coarse browser and OS, not the raw string. */
  userAgent?: string | null;
  userNote?: string | null;
  /** Included only when `includeDesign` is true. */
  designSource?: string | null;
  includeDesign?: boolean;
  screenshot?: ProblemReportScreenshot;
  /** ISO-8601 UTC time. Omitted from the report when it is not that shape. */
  reportedAt?: string | null;
}

export interface ProblemReport {
  title: string;
  body: string;
  issueUrl: string;
  /** Sanitized design text. Present only when the caller opted in and the source was non-empty. */
  designAttachment?: string;
  includeDesign: boolean;
  redactions: number;
}

export interface SanitizedText {
  text: string;
  redactions: number;
}

/** True when a viewport PNG is small enough to hand to the user. */
export function screenshotWithinBound(byteLength: number): boolean {
  return Number.isFinite(byteLength) && byteLength >= 0 && byteLength <= MAX_SCREENSHOT_BYTES;
}

/** Strip emails, tokens, credential assignments, URL userinfo, query strings and local paths. */
export function sanitizeReportText(input: string): SanitizedText {
  let text = input;
  let redactions = 0;
  const apply = (pattern: RegExp, replacement: string | ((match: string, key: string) => string)) => {
    text = text.replace(pattern, (...args: string[]) => {
      redactions += 1;
      if (typeof replacement === 'function') return replacement(args[0] ?? '', args[1] ?? '');
      return replacement;
    });
  };
  // Userinfo before the email pass, so `user:pass@host` is not half-read as an address.
  apply(URL_USERINFO, (match) => `${match.slice(0, match.indexOf('://') + 3)}[redacted]@`);
  apply(EMAIL, REDACTED_EMAIL);
  for (const pattern of TOKEN_PATTERNS) apply(pattern, REDACTED_TOKEN);
  apply(ASSIGNMENT, (_match, key) => `${key}${REDACTED_SECRET}`);
  apply(QUERY, '');
  apply(FILE_URL, REDACTED_PATH);
  apply(LOCAL_PATH, REDACTED_PATH);
  return { text, redactions };
}

/** Registry codes that appear in sanitized text. Other dotted words are ignored. */
export function knownDiagnosticCodesIn(text: string): string[] {
  const sanitized = sanitizeReportText(text).text;
  const known = new Set<string>(DIAGNOSTIC_CODES);
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of sanitized.matchAll(CODE_TOKEN)) {
    const code = match[0];
    if (!code || !known.has(code) || seen.has(code)) continue;
    seen.add(code);
    found.push(code);
    if (found.length >= MAX_DIAGNOSTICS) break;
  }
  return found;
}

/** Coarse browser and OS from a user agent. The raw string is not returned. */
export function describeClient(userAgent: string): { browser: string; os: string } {
  const ua = sanitizeReportText(userAgent).text;
  return { browser: detectBrowser(ua), os: detectOs(ua) };
}

export function buildProblemReport(input: ProblemReportInput): ProblemReport {
  const kind = cleanKind(input.kind);
  let redactions = 0;
  const take = (value: string | null | undefined, max: number): string => {
    const cleaned = sanitizeReportText(value ?? '');
    redactions += cleaned.redactions;
    return bound(cleaned.text.trim(), max);
  };

  const errorMessage = take(input.errorMessage, MAX_ERROR_CHARS);
  const hint = take(input.hint, MAX_DIAGNOSTIC_MESSAGE_CHARS);
  const note = take(input.userNote, MAX_NOTE_CHARS);
  const logLines = cleanLog(input.logLines ?? [], (line) => {
    const cleaned = sanitizeReportText(line);
    redactions += cleaned.redactions;
    return bound(cleaned.text.trim(), MAX_LOG_LINE_CHARS);
  });
  const diagnostics = cleanDiagnostics(input.diagnostics ?? [], (text, max) => {
    const cleaned = sanitizeReportText(text);
    redactions += cleaned.redactions;
    return bound(cleaned.text.trim(), max);
  }, knownDiagnosticCodesIn([errorMessage, hint, ...logLines].filter(Boolean).join('\n')));

  const design = cleanDesign(input.includeDesign === true, input.designSource, (text) => {
    const cleaned = sanitizeReportText(text);
    redactions += cleaned.redactions;
    return { text: bound(cleaned.text, MAX_DESIGN_CHARS), redactions: cleaned.redactions };
  });
  redactions += design.redactions;

  const client = describeClient(input.userAgent ?? '');
  const version = cleanToken(input.appVersion, VERSION) ?? 'dev';
  const commit = cleanToken(input.commit, COMMIT);
  const when = cleanToken(input.reportedAt, ISO_TIME);
  const title = bound(buildTitle(kind, errorMessage), MAX_TITLE_CHARS);
  const body = renderBody({
    kind, when, version, commit, client, errorMessage, hint, diagnostics, logLines, note,
    screenshot: input.screenshot ?? 'missing',
    includeDesign: input.includeDesign === true,
    designAttached: design.attachment !== undefined,
  });
  const fitted = fitIssue(title, body);
  return {
    title,
    body: fitted.body,
    issueUrl: fitted.url,
    ...(design.attachment !== undefined ? { designAttachment: design.attachment } : {}),
    includeDesign: input.includeDesign === true,
    redactions,
  };
}

function cleanKind(kind: ProblemReportKind | undefined): ProblemReportKind {
  if (kind === 'evaluate' || kind === 'export' || kind === 'general') return kind;
  return 'general';
}

function cleanToken(value: string | null | undefined, pattern: RegExp): string | null {
  const text = (value ?? '').trim();
  return pattern.test(text) ? text : null;
}

function bound(text: string, max: number): string {
  if (text.length <= max) return text;
  const marker = '…[truncated]';
  return text.slice(0, Math.max(0, max - marker.length)) + marker;
}

function cleanLog(lines: readonly string[], sanitizeLine: (line: string) => string): string[] {
  const kept = lines.slice(-MAX_LOG_LINES);
  const out: string[] = [];
  for (const line of kept) {
    const text = sanitizeLine(line);
    if (text) out.push(text);
  }
  return out;
}

interface CleanDiagnostic {
  code?: string;
  severity?: string;
  message?: string;
  hint?: string;
}

function cleanDiagnostics(
  rows: readonly ProblemReportDiagnostic[],
  sanitizeLine: (text: string, max: number) => string,
  codesFromText: readonly string[],
): CleanDiagnostic[] {
  const out: CleanDiagnostic[] = [];
  const seen = new Set<string>();
  const push = (row: CleanDiagnostic) => {
    const key = `${row.code ?? ''}|${row.message ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(row);
  };
  for (const code of codesFromText) push({ code });
  for (const row of rows) {
    if (out.length >= MAX_DIAGNOSTICS) break;
    const code = cleanStructuredCode(row.code, sanitizeLine);
    // A code that fails the check was secret-shaped. Drop the whole row so
    // the message cannot ride along with it.
    if (row.code && !code) continue;
    const message = row.message ? sanitizeLine(row.message, MAX_DIAGNOSTIC_MESSAGE_CHARS) : '';
    const hint = row.hint ? sanitizeLine(row.hint, MAX_DIAGNOSTIC_MESSAGE_CHARS) : '';
    const severity = cleanSeverity(row.severity);
    if (!code && !message) continue;
    push({
      ...(code ? { code } : {}),
      ...(severity ? { severity } : {}),
      ...(message ? { message } : {}),
      ...(hint ? { hint } : {}),
    });
  }
  return out.slice(0, MAX_DIAGNOSTICS);
}

function cleanStructuredCode(
  code: string | undefined,
  sanitizeLine: (text: string, max: number) => string,
): string | null {
  if (!code) return null;
  const cleaned = sanitizeLine(code, 80);
  if (!STRUCTURED_CODE.test(cleaned) || cleaned.includes('[')) return null;
  return cleaned;
}

function cleanSeverity(severity: string | undefined): string | null {
  if (severity === 'error' || severity === 'warn' || severity === 'warning' || severity === 'info') {
    return severity === 'warning' ? 'warn' : severity;
  }
  return null;
}

function cleanDesign(
  include: boolean,
  source: string | null | undefined,
  sanitizeSource: (text: string) => { text: string; redactions: number },
): { attachment?: string; redactions: number } {
  if (!include) return { redactions: 0 };
  const raw = source ?? '';
  if (raw.trim().length === 0) return { redactions: 0 };
  const cleaned = sanitizeSource(raw);
  if (!cleaned.text.trim()) return { redactions: cleaned.redactions };
  return { attachment: cleaned.text, redactions: cleaned.redactions };
}

function buildTitle(kind: ProblemReportKind, errorMessage: string): string {
  const label = kind === 'evaluate' ? 'Studio evaluate failed' : kind === 'export' ? 'Studio export failed' : 'Studio problem report';
  const first = errorMessage.split('\n').find((line) => line.trim().length > 0)?.trim();
  if (!first) return label;
  return `${label}: ${first}`;
}

function renderBody(parts: {
  kind: ProblemReportKind;
  when: string | null;
  version: string;
  commit: string | null;
  client: { browser: string; os: string };
  errorMessage: string;
  hint: string;
  diagnostics: readonly CleanDiagnostic[];
  logLines: readonly string[];
  note: string;
  screenshot: ProblemReportScreenshot;
  includeDesign: boolean;
  designAttached: boolean;
}): string {
  const lines = [
    '### KernelCAD problem report',
    '',
    `Kind: ${parts.kind}`,
    ...(parts.when ? [`When: ${parts.when}`] : []),
    `App: ${parts.version}`,
    ...(parts.commit ? [`Commit: ${parts.commit}`] : []),
    `Browser: ${parts.client.browser}`,
    `OS: ${parts.client.os}`,
    '',
    '### Error',
    parts.errorMessage || '(none)',
    '',
    '### Hint',
    parts.hint || '(none)',
    '',
    '### Diagnostics',
    ...renderDiagnostics(parts.diagnostics),
    '',
    '### Log',
    ...renderLog(parts.logLines),
    '',
    '### Screenshot',
    screenshotLine(parts.screenshot),
    '',
    '### Design',
    designLine(parts.includeDesign, parts.designAttached),
    '',
    '### Note',
    parts.note || '(none)',
    '',
    'Review this text before submitting. The screenshot and the design are not uploaded by Studio.',
  ];
  return lines.join('\n');
}

function renderDiagnostics(rows: readonly CleanDiagnostic[]): string[] {
  if (rows.length === 0) return ['(none)'];
  return rows.map((row) => {
    const code = row.code ?? '(no code)';
    const severity = row.severity ? ` (${row.severity})` : '';
    const message = row.message ? `: ${row.message}` : '';
    const hint = row.hint ? ` — ${row.hint}` : '';
    return `- ${code}${severity}${message}${hint}`;
  });
}

function renderLog(lines: readonly string[]): string[] {
  if (lines.length === 0) return ['(none)'];
  return lines.map((line) => `- ${line}`);
}

function screenshotLine(screenshot: ProblemReportScreenshot): string {
  if (screenshot === 'ready') {
    return 'Attach the downloaded kernelcad-viewport.png. It is the model viewport only.';
  }
  if (screenshot === 'too-large') return 'The viewport screenshot was over the size bound and was left out.';
  return 'No viewport screenshot was captured.';
}

function designLine(includeDesign: boolean, attached: boolean): string {
  if (!includeDesign) {
    return 'Not included. Check "Include the design" to download it, then attach that file yourself.';
  }
  if (!attached) return 'Include the design was checked, but there was no design source to attach.';
  return 'Included only because that box was checked. Attach the downloaded kernelcad-design.kcad.ts after you review it. The design is not in this text.';
}

function fitIssue(title: string, body: string): { body: string; url: string } {
  let next = body.length > MAX_ISSUE_BODY_CHARS ? bound(body, MAX_ISSUE_BODY_CHARS) : body;
  let url = issueUrl(title, next);
  while (url.length > MAX_ISSUE_URL_CHARS && next.length > 80) {
    next = bound(next, Math.floor(next.length * 0.75));
    url = issueUrl(title, next);
  }
  return { body: next, url };
}

function issueUrl(title: string, body: string): string {
  return `${PROBLEM_REPORT_NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function detectOs(ua: string): string {
  const mac = ua.match(/Mac OS X ([0-9_]+)/);
  if (mac?.[1]) return `Mac OS X ${mac[1].replace(/_/g, '.')}`;
  if (/Windows NT 10\.0/.test(ua)) return 'Windows 10';
  if (/Windows NT 11\.0/.test(ua)) return 'Windows 11';
  const android = ua.match(/Android ([0-9.]+)/);
  if (android?.[1]) return `Android ${android[1]}`;
  if (/iPhone|iPad/.test(ua)) {
    const version = ua.match(/OS ([0-9_]+)/);
    return version?.[1] ? `iOS ${version[1].replace(/_/g, '.')}` : 'iOS';
  }
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

function detectBrowser(ua: string): string {
  const edge = ua.match(/Edg\/([0-9.]+)/);
  if (edge?.[1]) return `Edge/${edge[1]}`;
  const chrome = ua.match(/Chrome\/([0-9.]+)/);
  if (chrome?.[1]) return `Chrome/${chrome[1]}`;
  const firefox = ua.match(/Firefox\/([0-9.]+)/);
  if (firefox?.[1]) return `Firefox/${firefox[1]}`;
  const safari = ua.match(/Version\/([0-9.]+).{0,80}Safari\//);
  if (safari?.[1] && !/Chrome\//.test(ua)) return `Safari/${safari[1]}`;
  return 'unknown';
}
