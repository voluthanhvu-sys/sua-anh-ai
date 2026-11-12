// Zero-cost end-to-end test: real app in headless Edge/Chrome, fake CheapAI/OpenAI API on a local port.
// node tests/e2e.mjs   -> prints PASS/FAIL, screenshot in tmp/e2e.png (look at it)
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 8091, API = 8092, CDP = 9333;
const icon = readFileSync(join(root, 'web/icons/icon-512.png'));
const fail = (m) => { console.error('FAIL: ' + m); cleanup(); process.exit(1); };

// Fake API. Chat: 1st turn streams a tool call (edit_image), the turn after the tool result streams text.
const seen = [];
const sse = (res, chunks) => { res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  for (const c of chunks) res.write('data: ' + JSON.stringify({ choices: [{ delta: c }] }) + '\n\n'); res.end('data: [DONE]\n\n'); };
const api = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('latin1'); seen.push(req.url + ' ' + body);
    if (req.url === '/v1/chat/completions') {
      const j = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!j.tools) return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ choices: [{ message: { content: 'SUMMARY-OK' } }] }));
      if (j.messages.some((m) => m.role === 'tool')) return sse(res, [{ content: 'Xong rồi! ' }, { content: 'Nền đã đổi.' }]);
      if (/caption/i.test(JSON.stringify(j.messages.at(-1)))) return sse(res, [{ content: 'Caption: hoàng hôn rực rỡ' }]);
      if (/đội mũ/.test(JSON.stringify(j.messages.at(-1)))) return sse(res, [{ tool_calls: [{ index: 0, id: 'call_2', function: { name: 'edit_image', arguments: '{"prompt":"Add a red hat"}' } }] }]);
      return sse(res, [{ tool_calls: [{ index: 0, id: 'call_1', function: { name: 'edit_image', arguments: '' } }] },
        { tool_calls: [{ index: 0, function: { arguments: '{"prompt":"Change the background' } }] },
        { tool_calls: [{ index: 0, function: { arguments: ' to sunset orange"}' } }] }]);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ data: [{ b64_json: icon.toString('base64') }] }));
  });
}).listen(API);
const app = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), String(APP)], { stdio: 'ignore' });

const browsers = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'];
const exe = browsers.find(existsSync) || fail('no Edge/Chrome found');
const profile = join(tmpdir(), 'pea-e2e-profile');
rmSync(profile, { recursive: true, force: true }); // a failed run exits early and leaves its profile (with a saved key) behind
const br = spawn(exe, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=430,1000', 'about:blank'], { stdio: 'ignore' });
function cleanup() { try { br.kill(); app.kill(); api.close(); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 250) { if (await evalJs(expr)) return true; await sleep(250); } return false; };

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!target) fail('browser did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = pending.get(d.id); if (p) { pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');

  // 1. no key -> lock screen only
  await send('Page.navigate', { url: `http://127.0.0.1:${APP}/` }); await sleep(1500);
  if (!(await evalJs(`!document.querySelector('#locked').classList.contains('hidden') && document.querySelector('#composer').classList.contains('hidden')`))) fail('no lock screen without key');

  // 2a. paste-unlock on the lock screen (chat apps may cut the #k= part off links)
  await evalJs(`document.querySelector('#unlockInput').value='https://x/sua-anh-ai/#k=sk-pasted'; document.querySelector('#btnUnlock').click(); true`); await sleep(1500);
  if ((await evalJs(`JSON.parse(localStorage.getItem('cfg')).key`)) !== 'sk-pasted' || !(await evalJs(`document.querySelector('#locked').classList.contains('hidden')`))) fail('paste unlock failed');
  // 2b. a hash-only change in an open tab (no page load — the 2026-11-08 bug) must still pick up the key
  await evalJs(`location.hash='k=sk-fromlink'; true`); await sleep(1500);
  if ((await evalJs(`JSON.parse(localStorage.getItem('cfg')).key`)) !== 'sk-fromlink') fail('#k= key not picked up');
  await evalJs(`localStorage.setItem('cfg', JSON.stringify({key:'sk-test', base:'http://127.0.0.1:${API}/v1'})); true`);
  await send('Page.navigate', { url: `http://127.0.0.1:${APP}/` }); await sleep(1500);

  // 3. attach a photo + ask for an edit -> chat call -> tool call -> image edit -> final text
  const doc = await send('DOM.getDocument');
  const { nodeId } = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#filePick' });
  await send('DOM.setFileInputFiles', { nodeId, files: [join(root, 'web/icons/icon-512.png')] });
  if (!(await waitFor(`document.querySelectorAll('#attached img').length===1`))) fail('attached photo not shown');
  await evalJs(`document.querySelector('#input').value='đổi nền thành màu cam'; document.querySelector('#btnSend').click(); true`);
  if (!(await waitFor(`/Nền đã đổi/.test(document.querySelector('#chat').innerText) && document.querySelectorAll('.msg.bot .imgs img').length===1`)))
    fail('no edited image + reply; chat: ' + (await evalJs(`document.querySelector('#chat').innerText`)));
  const chat1 = seen.find((s) => s.startsWith('/v1/chat/completions')) || '';
  for (const f of ['claude-sonnet-5', '"stream":true', 'edit_image', 'image_url', 'data:image/jpeg']) if (!chat1.includes(f)) fail('chat request missing ' + f);
  const edit = seen.find((s) => s.startsWith('/v1/images/edits')) || fail('edit endpoint not called');
  for (const f of ['gpt-image-2.5', 'Change the background to sunset orange', 'name="image[]"', 'input_fidelity', 'name="quality"\r\n\r\nmedium']) if (!edit.includes(f)) fail('edit request missing ' + f);
  if (!seen.some((s) => s.startsWith('/v1/chat/completions') && s.includes('"role":"tool"'))) fail('tool result not sent back');

  // 4. plain chat (no tool) + conversation survives a reload + shows in the drawer
  await evalJs(`document.querySelector('#input').value='viết caption'; document.querySelector('#btnSend').click(); true`);
  if (!(await waitFor(`/hoàng hôn rực rỡ/.test(document.querySelector('#chat').innerText)`))) fail('plain chat reply missing');
  await send('Page.reload'); await sleep(1500);
  if (!(await waitFor(`document.querySelectorAll('.msg').length===4 && document.querySelectorAll('.msg img').length===2`))) fail('conversation not restored after reload');
  await evalJs(`document.querySelector('#btnMenu').click(); true`);
  if (!(await waitFor(`document.querySelectorAll('#convList span').length===1`))) fail('conversation not listed');
  await evalJs(`document.querySelector('#btnCloseDrawer').click(); true`);

  // 5. edit the edit result again (2026-11-12 anti-blur): chat sees the bot's result picture; the image call is redone from
  //    the ORIGINAL photo with both edits combined, not chained on the result.
  const before = seen.length;
  await evalJs(`document.querySelector('#input').value='đội mũ đỏ'; document.querySelector('#btnSend').click(); true`);
  if (!(await waitFor(`document.querySelectorAll('.msg.bot .imgs img').length===2`))) fail('second edit result missing');
  const chat3 = seen.slice(before).find((s) => s.startsWith('/v1/chat/completions')) || '';
  // seen[] is latin1-decoded, so match ASCII only
  if ((chat3.match(/data:image\/jpeg/g) || []).length !== 2) fail('chat did not see both photos (user + bot result)');
  const edit2 = seen.slice(before).find((s) => s.startsWith('/v1/images/edits')) || fail('second edit not called');
  for (const f of ['Apply ALL of these edits', '1. Change the background to sunset orange', '2. Add a red hat']) if (!edit2.includes(f)) fail('second edit not combined: missing ' + f);
  if ((edit2.match(/name="image\[\]"/g) || []).length !== 1 || !edit2.includes('filename="image1.jpg"')) fail('second edit not made from the original JPEG');

  // 5b. version label visible in the menu (same text on welcome + Settings)
  if (!(await evalJs(`/^Phiên bản v\\d+ · \\d\\d\\/\\d\\d\\/\\d{4}$/.test(document.querySelector('#drawer .ver').textContent)`))) fail('version label missing');

  // 6. long chat: 320 messages -> one summary call for the part before the last 300, then the chat call carries it + <= 300 messages.
  await evalJs(`for (let i = 0; i < 160; i++) conv.messages.push({ role: 'user', text: 'cũ ' + i }, { role: 'assistant', text: 'ok ' + i }); true`);
  const before6 = seen.length;
  await evalJs(`document.querySelector('#input').value='viết caption 2'; document.querySelector('#btnSend').click(); true`);
  if (!(await waitFor(`!document.querySelector('#btnSend').disabled && /hoàng hôn rực rỡ/.test(document.querySelector('.msg.bot:last-child').innerText)`))) fail('long chat reply missing');
  const calls6 = seen.slice(before6).filter((s) => s.startsWith('/v1/chat/completions'));
  if (calls6.length !== 2 || calls6[0].includes('"tools"')) fail('expected 1 summary call then 1 chat call, got ' + calls6.length);
  const chat6 = JSON.parse(calls6[1].slice(calls6[1].indexOf('{')));
  if (!chat6.messages[0].content.includes('SUMMARY-OK')) fail('summary not in the system prompt');
  if (chat6.messages.length > 301 || chat6.messages[1].role !== 'user') fail('window wrong: ' + chat6.messages.length + ' msgs, first ' + chat6.messages[1].role);

  mkdirSync(join(root, 'tmp'), { recursive: true });
  writeFileSync(join(root, 'tmp/e2e.png'), Buffer.from((await send('Page.captureScreenshot')).data, 'base64'));
  console.log('PASS: lock screen, paste unlock, #k= hash change, photo attach, streamed tool call -> image edit -> reply, plain chat, restore after reload, drawer, re-edit from original (combined, medium), chat sees bot results, 300-msg window + summary. Screenshot tmp/e2e.png');
} catch (e) { fail(e.message); }
cleanup();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0); }, 500);
