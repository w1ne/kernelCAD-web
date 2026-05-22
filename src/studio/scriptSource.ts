export async function loadStudioScriptSource(script: string): Promise<string> {
  const response = await fetch(`/__kernelcad/source?script=${encodeURIComponent(script)}`);
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : response.statusText;
    throw new Error(message);
  }
  if (typeof payload?.source !== 'string') {
    throw new Error('Source endpoint did not return source code.');
  }
  return payload.source;
}
