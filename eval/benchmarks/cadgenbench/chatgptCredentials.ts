// SPDX-License-Identifier: MIT
import { readFileSync, writeFileSync, renameSync, mkdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

type Credentials = {client_id:string; access_token:string; refresh_token:string; scope:string; expires_in:number; saved_at:number; [key:string]:unknown};
export function chatgptTokenProvider(directory: string): () => Promise<string> {
  const path=join(directory,'credentials.json'), lock=join(directory,'refresh.lock');
  let pending: Promise<string> | undefined;
  const get = async (): Promise<string> => {
    let record=JSON.parse(readFileSync(path,'utf8')) as Credentials;
    if (Date.now() < record.saved_at + record.expires_in*1000 - 60_000) return record.access_token;
    try { mkdirSync(lock,{mode:0o700}); } catch { throw new Error('ChatGPT credential refresh is already in progress; retry after it finishes'); }
    try {
      record=JSON.parse(readFileSync(path,'utf8')) as Credentials;
      if (Date.now() < record.saved_at + record.expires_in*1000 - 60_000) return record.access_token;
      const response=await fetch('https://auth.openai.com/api/accounts/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:record.client_id,refresh_token:record.refresh_token,resource:'https://api.openai.com/v1'}),signal:AbortSignal.timeout(30_000)});
      if (!response.ok) throw new Error(`ChatGPT credential refresh failed: HTTP ${response.status}`);
      const next=await response.json() as Partial<Credentials>;
      if (!next.access_token || !next.refresh_token || !Number.isFinite(next.expires_in) || !next.scope?.split(' ').includes('chatgpt.tokens.use.direct')) throw new Error('Incomplete ChatGPT credential refresh');
      const temp=join(directory,`.credentials-${randomUUID()}`);
      writeFileSync(temp,JSON.stringify({...record,...next,saved_at:Date.now()}),{mode:0o600,flag:'wx'}); renameSync(temp,path);
      return next.access_token;
    } finally { rmdirSync(lock); }
  };
  return () => pending ?? (pending=get().finally(()=>{pending=undefined;}));
}
