// Zero-cost end-to-end test: real app in headless Edge/Chrome, fake OpenAI API on a local port.
// node tests/e2e.mjs   -> prints PASS/FAIL, screenshot in tmp/e2e.png
import { createServer } from 'node:http';
import { spawn, execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 8091, API = 8092, CDP = 9333;
const icon = readFileSync(join(root, 'web/icons/icon-512.png'));
const fail = (m) => { console.error('FAIL: ' + m); cleanup(); process.exit(1); };

// fake API: checks the multipart request, answers with a PNG
let seen = '';
const api = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  const chunks = []; req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    seen = req.url + ' ' + Buffer.concat(chunks).toString('latin1');
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ data: [{ b64_json: icon.toString('base64') }] }));
  });
}).listen(API);
const app = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), String(APP)], { stdio: 'ignore' });

const browsers = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'];
const exe = browsers.find(existsSync) || fail('no Edge/Chrome found');
const profile = join(tmpdir(), 'pea-e2e-profile');
const br = spawn(exe, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=430,1400', 'about:blank'], { stdio: 'ignore' });
function cleanup() { try { br.kill(); app.kill(); api.close(); } catch {} }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!target) fail('browser did not start');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = pending.get(d.id); if (p) { pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable');

  await send('Page.navigate', { url: `http://127.0.0.1:${APP}/` }); await sleep(1500);
  if (!(await evalJs(`!document.querySelector('#locked').classList.contains('hidden') && document.querySelector('#app').classList.contains('hidden')`))) fail('no lock screen without key');
  await evalJs(`localStorage.setItem('cfg', JSON.stringify({key:'sk-test', base:'http://127.0.0.1:${API}/v1'})); indexedDB.deleteDatabase('photo-edit-ai'); true`);
  await send('Page.reload'); await sleep(1500);

  // pick a photo through the real file input
  const doc = await send('DOM.getDocument');
  const { nodeId } = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#filePick' });
  await send('DOM.setFileInputFiles', { nodeId, files: [join(root, 'web/icons/icon-512.png')] });
  await sleep(800);
  if (!(await evalJs(`!document.querySelector('#srcBox').classList.contains('empty')`))) fail('picked photo not shown');

  await evalJs(`document.querySelector('#presets button').click(); document.querySelector('#btnGo').click(); true`);
  for (let i = 0; i < 20; i++) { await sleep(300); if (await evalJs(`!document.querySelector('#resultCard').classList.contains('hidden') && document.querySelectorAll('#history img').length===1`)) break; }

  const st = await evalJs(`document.querySelector('#status').textContent`);
  if (!seen.startsWith('/v1/images/edits')) fail('edit endpoint not called; status: ' + st);
  for (const f of ['name="model"', 'gpt-image-2.5', 'name="prompt"', 'Retouch', 'name="image"', 'input_fidelity']) if (!seen.includes(f)) fail('request missing ' + f);
  if (!(await evalJs(`document.querySelectorAll('#history img').length===1`))) fail('no history entry; status: ' + st);
  if (!/^Xong/.test(st)) fail('status: ' + st);

  // no photo -> generate endpoint
  await evalJs(`document.querySelector('#btnClearSrc').click(); document.querySelector('#prompt').value='a cat'; document.querySelector('#btnGo').click(); true`);
  await sleep(1500);
  if (!seen.startsWith('/v1/images/generations')) fail('generate endpoint not called');

  // ready-made link: key in the #k= part is picked up
  await send('Page.navigate', { url: `http://127.0.0.1:${APP}/#k=sk-fromlink` }); await send('Page.reload'); await sleep(1200);
  if ((await evalJs(`JSON.parse(localStorage.getItem('cfg')).key`)) !== 'sk-fromlink') fail('#k= key not picked up');
  mkdirSync(join(root, 'tmp'), { recursive: true });
  writeFileSync(join(root, 'tmp/e2e.png'), Buffer.from((await send('Page.captureScreenshot', { captureBeyondViewport: true })).data, 'base64'));
  console.log('PASS: pick photo, preset, edit call (model/prompt/image/fidelity), result, history, generate call, #k= link key, lock screen. Screenshot tmp/e2e.png');
} catch (e) { fail(e.message); }
cleanup();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(0); }, 500);
