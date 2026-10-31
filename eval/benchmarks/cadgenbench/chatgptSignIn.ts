// SPDX-License-Identifier: MIT
// Interactive local OAuth registration for the CADGenBench runner.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const dir = process.env.CADGENBENCH_AUTH_DIR;
if (!dir) throw new Error('Set CADGENBENCH_AUTH_DIR to a private directory outside the checkout');
mkdirSync(dir, {recursive:true, mode:0o700}); chmodSync(dir, 0o700);
if (existsSync(join(dir, 'credentials.json'))) throw new Error('Existing credentials found; use a separate auth directory');
const hostPath = join(dir, 'host-id');
if (!existsSync(hostPath)) writeFileSync(hostPath, `urn:uuid:${randomUUID()}`, {mode:0o600, flag:'wx'});
const host = readFileSync(hostPath, 'utf8').trim();
const random = () => randomBytes(32).toString('base64url');
const state = random(), nonce = random(), verifier = random();
const existingClientId = process.env.CADGENBENCH_CHATGPT_CLIENT_ID;
const challenge = createHash('sha256').update(verifier).digest('base64url');
const server = createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No loopback address');
  const redirect = `http://127.0.0.1:${address.port}/auth/callback`;
  const url = new URL('https://auth.openai.com/api/accounts/authorize');
  url.search = new URLSearchParams({client_id:existingClientId ?? 'dynamic_agent_client',...(existingClientId ? {} : {agent_name_hint:'kernelCAD benchmark runner'}),ext_agent_host_id:host,response_type:'code',redirect_uri:redirect,scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',resource:'https://api.openai.com/v1',state,nonce,code_challenge_method:'S256',code_challenge:challenge}).toString();
  console.log(`Continue with ChatGPT: ${url}`);
  const timer = setTimeout(() => { server.close(); console.error('Sign-in timed out'); process.exitCode=1; }, 1_800_000);
  server.on('request', async (req,res) => {
    const request = new URL(req.url ?? '/', redirect);
    if (request.pathname !== '/auth/callback') {res.writeHead(404).end(); return;}
    if (request.searchParams.get('state') !== state) {res.writeHead(400).end('Invalid authorization state'); return;}
    clearTimeout(timer); server.close();
    try {
      const code=request.searchParams.get('code'), returnedClientId=request.searchParams.get('client_id');
      if (existingClientId && returnedClientId && existingClientId !== returnedClientId) throw new Error('Unexpected client ID');
      const clientId=returnedClientId ?? existingClientId;
      if (request.searchParams.get('error') || !code || !clientId || clientId === 'dynamic_agent_client') throw new Error('Authorization was declined or incomplete');
      const reply = await fetch('https://auth.openai.com/api/accounts/oauth/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,code,code_verifier:verifier,redirect_uri:redirect,resource:'https://api.openai.com/v1'})});
      if (!reply.ok) throw new Error(`Token exchange failed: HTTP ${reply.status}`);
      const tokens = await reply.json() as {id_token:string;access_token:string;refresh_token:string;scope:string;expires_in:number;token_type:string};
      const {payload} = await jwtVerify(tokens.id_token,createRemoteJWKSet(new URL('https://auth.openai.com/.well-known/jwks.json')),{issuer:'https://auth.openai.com',audience:clientId,requiredClaims:['sub','exp','iat'],clockTolerance:5});
      if (payload.nonce !== nonce || !payload.sub || !tokens.scope?.split(' ').includes('chatgpt.tokens.use.direct') || !tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_in)) throw new Error('Identity or plan authorization was not validated');
      const path=join(dir,'credentials.json'), temporary=join(dirname(path),`.credentials-${randomUUID()}`);
      writeFileSync(temporary,JSON.stringify({...tokens,client_id:clientId,ext_agent_host_id:host,subject:payload.sub,issuer:'https://auth.openai.com',saved_at:Date.now()}),{mode:0o600,flag:'wx'}); renameSync(temporary,path);
      res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('ChatGPT authorization complete. You can close this tab.');
      console.log('ChatGPT plan authorization completed and credentials saved locally.');
    } catch(e) {res.writeHead(400,{'Content-Type':'text/plain','Cache-Control':'no-store'}).end('Authorization failed. Return to the benchmark runner.'); console.error(e instanceof Error ? e.message : 'Authorization failed'); process.exitCode=1;}
  });
});
