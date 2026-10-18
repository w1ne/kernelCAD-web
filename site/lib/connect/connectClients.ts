// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import {
  CHATGPT_CONNECTORS_URL,
  CLAUDE_CODE_CMD,
  CLAUDE_CONNECTORS_URL,
  CODEX_ADD_CMD,
  CODEX_LOGIN_CMD,
  cursorDeeplink,
  vscodeDeeplink,
} from './connectLinks';

/**
 * The agents a user can connect on /connect, with the steps for each one.
 * Most people connect in their first 10 minutes or never, so every client
 * gets the shortest honest path: a deep link where one exists, the exact
 * command to copy where it does not.
 *
 * Step text marks UI labels with **double stars**; the page renders them bold.
 */

export type ConnectClientId = 'chatgpt' | 'claude' | 'claude-code' | 'codex' | 'cursor' | 'vscode';

export interface ConnectCommand {
  readonly label: string;
  readonly value: string;
}

export interface ConnectLink {
  readonly label: string;
  readonly href: string;
}

export interface ConnectClient {
  readonly id: ConnectClientId;
  readonly label: string;
  /** Where it runs, shown under the name in the picker. */
  readonly where: string;
  readonly steps: readonly string[];
  /** Commands to copy, in order. */
  readonly commands?: readonly ConnectCommand[];
  /** Opens the client where the server is added (settings page or installer). */
  readonly link?: ConnectLink;
  /** Show the MCP URL to copy next to the steps. */
  readonly needsUrl: boolean;
  /** Plan limits and other conditions, in one sentence. */
  readonly note?: string;
  /** Where the starter prompt goes ("a new ChatGPT chat"). */
  readonly tryIn: string;
}

export const CONNECT_CLIENTS: readonly ConnectClient[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    where: 'Web and desktop',
    needsUrl: true,
    link: { label: 'Open ChatGPT settings', href: CHATGPT_CONNECTORS_URL },
    steps: [
      'Open **Settings → Apps & Connectors → Advanced settings** and turn on **Developer mode**.',
      'Click **Create**. Name it kernelCAD, paste the MCP URL, choose **OAuth** and save.',
      'Sign in to kernelCAD when ChatGPT asks.',
      'In a new chat, open **+ → Developer mode** and turn on kernelCAD.',
    ],
    note: 'Developer mode needs a paid ChatGPT plan.',
    tryIn: 'a new ChatGPT chat with kernelCAD turned on',
  },
  {
    id: 'claude',
    label: 'Claude',
    where: 'Web and desktop',
    needsUrl: true,
    link: { label: 'Open Claude connectors', href: CLAUDE_CONNECTORS_URL },
    steps: [
      'Open **Settings → Connectors** and click **Add custom connector**.',
      'Name it kernelCAD, paste the MCP URL and click **Add**.',
      'Click **Connect** and sign in to kernelCAD.',
    ],
    note: 'The same connector works in the Claude desktop and mobile apps.',
    tryIn: 'a new Claude chat',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    where: 'Terminal',
    needsUrl: false,
    commands: [{ label: 'Add the server', value: CLAUDE_CODE_CMD }],
    steps: [
      'Run the command in your terminal.',
      'Start Claude Code, type **/mcp**, pick **kernelcad** and choose **Authenticate**.',
      'Sign in to kernelCAD in the browser window that opens.',
    ],
    tryIn: 'Claude Code',
  },
  {
    id: 'codex',
    label: 'Codex',
    where: 'Terminal',
    needsUrl: false,
    commands: [
      { label: 'Add the server', value: CODEX_ADD_CMD },
      { label: 'Sign in', value: CODEX_LOGIN_CMD },
    ],
    steps: [
      'Run the first command to add kernelCAD to Codex.',
      'Run the second command and sign in to kernelCAD in the browser.',
      'Start **codex** in any folder.',
    ],
    tryIn: 'Codex',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    where: 'Editor',
    needsUrl: false,
    link: { label: 'Add to Cursor', href: cursorDeeplink() },
    steps: [
      'Click **Add to Cursor** and confirm the install.',
      'Open **Settings → MCP**, click **Connect** next to kernelcad and sign in.',
    ],
    tryIn: 'the Cursor agent chat',
  },
  {
    id: 'vscode',
    label: 'VS Code',
    where: 'Editor',
    needsUrl: false,
    link: { label: 'Install in VS Code', href: vscodeDeeplink() },
    steps: [
      'Click **Install in VS Code** and confirm the install.',
      'Start the server when VS Code asks, and sign in to kernelCAD.',
    ],
    tryIn: 'the VS Code chat in Agent mode',
  },
];

export const DEFAULT_CLIENT: ConnectClientId = 'chatgpt';

/** The client for a `?client=` value; unknown values give the default. */
export function connectClient(id: unknown): ConnectClient {
  return CONNECT_CLIENTS.find((c) => c.id === id) ?? CONNECT_CLIENTS.find((c) => c.id === DEFAULT_CLIENT)!;
}

/**
 * The first thing to try after connecting. It asks the agent to open the
 * model in Studio, because that saves it to the user's projects: a model
 * that is only evaluated or rendered is not saved.
 */
export const STARTER_PROMPT =
  'Design a wall bracket for a 30 mm round sensor with kernelCAD: a 3 mm plate with two M4 screw holes ' +
  'and a clip ring that holds the sensor. Check that it builds, then open it in kernelCAD Studio so it is ' +
  'saved to my projects.';

export interface TextSegment {
  readonly text: string;
  readonly strong: boolean;
}

/** Split step text on **double stars** into plain and bold segments. */
export function emphasisSegments(step: string): TextSegment[] {
  return step
    .split('**')
    .map((text, i) => ({ text, strong: i % 2 === 1 }))
    .filter((s) => s.text.length > 0);
}
