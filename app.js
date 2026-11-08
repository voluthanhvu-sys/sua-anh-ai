// Sửa Ảnh AI — a private ChatGPT-style app: a chat model (tool calling) + an image model, straight from the browser. No backend.
'use strict';
const $ = (s) => document.querySelector(s);

// ---------- settings (localStorage, this device only) ----------
// Default provider = CheapAI (OpenAI-compatible, CORS open). Chat model picked by test 2026-11-08 (fast, tool calls, cheap).
const DEFAULTS = { key: '', base: 'https://api.cheapai.io/v1', chatModel: 'claude-sonnet-5', model: 'gpt-image-2.5', size: 'auto', fidelity: true, quality: 'medium' };
const cfg = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('cfg') || '{}'));
const saveCfg = () => localStorage.setItem('cfg', JSON.stringify(cfg));
// Ready-made link: https://.../#k=<key> — the part after # never reaches any server; the app keeps the key on this device.
// The hash stays in the URL on purpose: an iPhone Home Screen app has its own storage and reads the key from its saved URL.
const hashKey = new URLSearchParams(location.hash.slice(1)).get('k');
if (hashKey && hashKey !== cfg.key) { cfg.key = hashKey; saveCfg(); }

const SYSTEM = `Bạn là trợ lý AI thân thiện trong app "Sửa Ảnh AI". Trả lời ngắn gọn, tự nhiên, bằng ngôn ngữ người dùng đang dùng (mặc định tiếng Việt). Bạn trò chuyện và giải đáp mọi chủ đề, và là chuyên gia chỉnh ảnh.
Ảnh trong cuộc trò chuyện được đánh số [ảnh 1], [ảnh 2]... theo thứ tự xuất hiện. Bạn chỉ nhìn thấy 2 ảnh gần nhất của người dùng; ảnh khác chỉ có số.
- Người dùng muốn sửa ảnh có sẵn: gọi edit_image. "prompt" viết bằng tiếng Anh, cụ thể, nói rõ cái gì đổi và cái gì giữ nguyên (khuôn mặt, danh tính, dáng, bố cục). Mặc định sửa ảnh mới nhất; ghép nhiều ảnh thì đưa nhiều số.
- Muốn tạo ảnh mới từ chữ: gọi generate_image.
- Yêu cầu chưa rõ thì làm theo cách hợp lý nhất rồi gợi ý chỉnh thêm, đừng hỏi lại nhiều.
- Ảnh xong: 1-2 câu ngắn về kết quả, có thể gợi ý một chỉnh sửa tiếp theo. Không lặp lại prompt tiếng Anh.`;

const TOOLS = [
  { type: 'function', function: { name: 'edit_image', description: 'Edit photos from the chat with the image model. The result is shown to the user as a new image.',
    parameters: { type: 'object', properties: { prompt: { type: 'string', description: 'Detailed English edit instruction' },
      images: { type: 'array', items: { type: 'integer' }, description: 'Image numbers to use; default = the latest image' } }, required: ['prompt'] } } },
  { type: 'function', function: { name: 'generate_image', description: 'Create a brand-new image from a text description.',
    parameters: { type: 'object', properties: { prompt: { type: 'string', description: 'Detailed English description' },
      shape: { type: 'string', enum: ['square', 'portrait', 'landscape'] } }, required: ['prompt'] } } },
];

const SUGGEST = ['Làm đẹp tự nhiên ảnh này', 'Xoá phông cho ảnh', 'Đổi nền thành bãi biển hoàng hôn', 'Phục hồi ảnh cũ này',
  'Biến ảnh thành tranh anime', 'Tạo ảnh chú mèo phi hành gia', 'Viết caption hay cho ảnh này'];

// ---------- storage (IndexedDB: one record per conversation, images kept as Blobs) ----------
const dbp = new Promise((res, rej) => {
  const q = indexedDB.open('photo-edit-ai', 2);
  q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains('conv')) q.result.createObjectStore('conv', { keyPath: 'id' }); };
  q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
});
const tx = async (mode, fn) => { const db = await dbp; return new Promise((res, rej) => {
  const t = db.transaction('conv', mode); const r = fn(t.objectStore('conv'));
  t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
const convAll = async () => ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.updated - a.updated);
const convSave = () => { conv.updated = Date.now(); return tx('readwrite', (s) => s.put(conv)); };
const newConv = () => ({ id: Date.now(), updated: Date.now(), title: '', messages: [] });

// ---------- state ----------
let conv = newConv();
let pending = [];          // images attached to the next message
let busy = false;
let viewing = null;        // blob shown in the viewer

// ---------- image helpers ----------
function loadImg(blob) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh này')); i.src = URL.createObjectURL(blob); });
}
// Resize + re-encode to JPEG (also turns iPhone HEIC into a format the API accepts).
async function shrink(blob, max, q = 0.9) {
  const img = await loadImg(blob);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', q));
}
const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
const b64ToBlob = (b64, type = 'image/png') => { const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };
const urls = new WeakMap();   // one object URL per blob
const urlOf = (b) => { if (!urls.has(b)) urls.set(b, URL.createObjectURL(b)); return urls.get(b); };
const allImages = () => conv.messages.flatMap((m) => m.images || []);

// ---------- API ----------
const apiBase = () => cfg.base.replace(/\/+$/, '');
const auth = () => ({ Authorization: 'Bearer ' + cfg.key });
async function apiError(r) { const j = await r.json().catch(() => ({})); const e = new Error((j.error && j.error.message) || ('Lỗi ' + r.status)); e.status = r.status; return e; }

async function imageCall(prompt, images, shape, signal) {
  const size = { square: '1024x1024', portrait: '1024x1536', landscape: '1536x1024' }[shape] || cfg.size;
  const go = async (fidelity) => {
    let r;
    if (images.length) {
      const fd = new FormData();
      fd.append('model', cfg.model); fd.append('prompt', prompt); fd.append('n', '1'); fd.append('size', size); fd.append('quality', cfg.quality);
      if (fidelity) fd.append('input_fidelity', 'high');
      images.forEach((b, i) => fd.append('image[]', b, `image${i + 1}.${b.type === 'image/png' ? 'png' : 'jpg'}`));
      r = await fetch(apiBase() + '/images/edits', { method: 'POST', headers: auth(), body: fd, signal });
    } else {
      r = await fetch(apiBase() + '/images/generations', { method: 'POST', signal, headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, prompt, n: 1, size, quality: cfg.quality }) });
    }
    if (!r.ok) throw await apiError(r);
    const d = ((await r.json()).data || [])[0];
    if (d && d.b64_json) return b64ToBlob(d.b64_json);
    if (d && d.url) return (await fetch(d.url)).blob();
    throw new Error('API không trả ảnh');
  };
  try { return await go(images.length && cfg.fidelity); }
  catch (e) { if (images.length && cfg.fidelity && /fidelity/i.test(e.message)) return go(false); throw e; }
}

// Chat history -> API messages. Only the user's 2 newest images are sent as pictures (cost); the rest are numbers.
async function apiMessages(list) {
  const total = allImages().length; let n = 0; const out = [];
  for (const m of list) {
    const parts = []; const labels = [];
    for (const b of m.images || []) {
      n++; labels.push(`[ảnh ${n}]`);
      if (m.role === 'user' && n > total - 2) parts.push({ type: 'image_url', image_url: { url: await toDataUrl(await shrink(b, 768, 0.85)) } });
    }
    const text = [labels.join(' '), m.text].filter(Boolean).join('\n') || '(ảnh)';
    if (m.role === 'user') out.push({ role: 'user', content: parts.length ? [{ type: 'text', text }, ...parts] : text });
    else out.push({ role: 'assistant', content: text });
  }
  return [{ role: 'system', content: SYSTEM }, ...out.slice(-30)];
}

// Streams one chat turn; returns the text and any tool calls. Works with non-streaming replies too.
async function chatTurn(messages, onText, signal) {
  const r = await fetch(apiBase() + '/chat/completions', { method: 'POST', signal, headers: { ...auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.chatModel, messages, tools: TOOLS, stream: true, max_tokens: 1500 }) });
  if (!r.ok) throw await apiError(r);
  let text = ''; const calls = [];
  const take = (delta) => {
    if (!delta) return;
    if (delta.content) { text += delta.content; onText(text); }
    for (const tc of delta.tool_calls || []) {
      const c = (calls[tc.index || 0] = calls[tc.index || 0] || { id: '', name: '', args: '' });
      if (tc.id) c.id = tc.id;
      if (tc.function && tc.function.name) c.name += tc.function.name;
      if (tc.function && tc.function.arguments) c.args += tc.function.arguments;
    }
  };
  if (!/event-stream/.test(r.headers.get('content-type') || '')) { const j = await r.json(); const m = j.choices[0].message;
    take({ content: m.content, tool_calls: (m.tool_calls || []).map((t, i) => ({ index: i, ...t })) }); return { text, calls: calls.filter(Boolean) }; }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const d = line.slice(5).trim(); if (d === '[DONE]') continue;
      try { const j = JSON.parse(d); take(j.choices && j.choices[0] && j.choices[0].delta); } catch { /* keep-alive or partial */ }
    }
  }
  return { text, calls: calls.filter(Boolean) };
}

async function runTool(name, args, signal) {
  if (name === 'edit_image') {
    const imgs = allImages();
    const nums = Array.isArray(args.images) && args.images.length ? args.images : [imgs.length];
    const blobs = nums.map((n) => imgs[n - 1]).filter(Boolean);
    if (!blobs.length) throw new Error('chưa có ảnh nào để sửa');
    return imageCall(String(args.prompt || ''), blobs, null, signal);
  }
  if (name === 'generate_image') return imageCall(String(args.prompt || ''), [], args.shape, signal);
  throw new Error('công cụ không có: ' + name);
}

// ---------- send ----------
async function send() {
  if (busy) return;
  const text = $('#input').value.trim();
  if (!text && !pending.length) return;
  if (!cfg.key) return openSettings();
  busy = true; $('#btnSend').disabled = true;
  conv.messages.push({ role: 'user', text, images: pending });
  if (!conv.title) conv.title = (text || 'Ảnh').slice(0, 40);
  pending = []; renderAttached(); $('#input').value = ''; autoGrow();
  const history = conv.messages.slice();
  const bot = { role: 'assistant', text: '', images: [] };
  conv.messages.push(bot);
  render(); await convSave();
  const ctl = new AbortController(); const kill = setTimeout(() => ctl.abort(), 300000);
  const show = (t) => { bot.text = t; updateLast(); };
  try {
    let msgs = await apiMessages(history);
    let res = await chatTurn(msgs, show, ctl.signal);
    for (let round = 0; res.calls.length && round < 3; round++) {
      const calls = res.calls.map((c, i) => ({ id: c.id || `call_${round}_${i}`, type: 'function', function: { name: c.name, arguments: c.args || '{}' } }));
      const results = [];
      for (const c of calls) {
        let args = {}; try { args = JSON.parse(c.function.arguments); } catch { /* empty args */ }
        const t0 = Date.now();
        const tick = setInterval(() => setLastStatus(`${c.function.name === 'generate_image' ? 'Đang tạo ảnh' : 'Đang sửa ảnh'}... ${Math.round((Date.now() - t0) / 1000)} s (thường 20-60 s)`), 1000);
        try { bot.images.push(await runTool(c.function.name, args, ctl.signal)); results.push(`Done: shown to the user as [ảnh ${allImages().length}].`); }
        catch (e) { results.push('Error: ' + e.message); bot.toolError = e.message; }
        finally { clearInterval(tick); setLastStatus(''); }
        updateLast(); convSave();
      }
      msgs = [...msgs, { role: 'assistant', content: res.text || null, tool_calls: calls },
        ...calls.map((c, i) => ({ role: 'tool', tool_call_id: c.id, content: results[i] }))];
      const before = bot.text ? bot.text + '\n\n' : '';
      res = await chatTurn(msgs, (t) => show(before + t), ctl.signal);
    }
    if (!bot.text && !bot.images.length) bot.text = bot.toolError ? '⚠️ ' + bot.toolError : '(không có trả lời)';
  } catch (e) {
    bot.err = true;
    bot.text = (bot.text ? bot.text + '\n\n' : '') + '⚠️ ' + (e.name === 'AbortError' ? 'Quá lâu không có kết quả, thử lại nhé' : e.message);
  } finally {
    clearTimeout(kill); busy = false; $('#btnSend').disabled = false;
    updateLast(); await convSave();
  }
}

// ---------- rendering ----------
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
function msgEl(m, isLast) {
  const d = document.createElement('div');
  d.className = 'msg ' + (m.role === 'user' ? 'user' : 'bot') + (m.err ? ' err' : '');
  if (m.images && m.images.length) {
    const box = document.createElement('div'); box.className = 'imgs' + (m.images.length > 1 ? ' many' : '');
    for (const b of m.images) { const i = document.createElement('img'); i.src = urlOf(b); i.onclick = () => openViewer(b); box.appendChild(i); }
    d.appendChild(box);
  }
  const t = document.createElement('div'); t.className = 'text';
  if (m.text) t.innerHTML = fmt(m.text); else if (m.role !== 'user' && isLast && busy) t.className = 'text typing';
  d.appendChild(t);
  const st = document.createElement('div'); st.className = 'status'; d.appendChild(st);
  return d;
}
function render() {
  const chat = $('#chat'); chat.textContent = '';
  conv.messages.forEach((m, i) => chat.appendChild(msgEl(m, i === conv.messages.length - 1)));
  $('#welcome').classList.toggle('hidden', conv.messages.length > 0);
  $('#title').textContent = conv.title || 'Sửa Ảnh AI';
  scrollDown();
}
function updateLast() {
  const chat = $('#chat'); const last = chat.lastElementChild; if (!last) return;
  const st = last.querySelector('.status').textContent;
  const fresh = msgEl(conv.messages[conv.messages.length - 1], true);
  fresh.querySelector('.status').textContent = st;
  chat.replaceChild(fresh, last); scrollDown();
}
function setLastStatus(s) { const last = $('#chat').lastElementChild; if (last) last.querySelector('.status').textContent = s; }
function scrollDown() { const m = $('main'); requestAnimationFrame(() => { m.scrollTop = m.scrollHeight; }); }
function renderAttached() {
  const box = $('#attached'); box.textContent = '';
  pending.forEach((b, i) => {
    const d = document.createElement('div'); const img = document.createElement('img'); img.src = urlOf(b);
    const x = document.createElement('button'); x.textContent = '✕'; x.onclick = () => { pending.splice(i, 1); renderAttached(); };
    d.append(img, x); box.appendChild(d);
  });
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }

// ---------- conversations drawer ----------
async function openDrawer() {
  const list = $('#convList'); list.textContent = '';
  for (const c of await convAll()) {
    if (!c.messages.length) continue;
    const row = document.createElement('div'); if (c.id === conv.id) row.className = 'on';
    const s = document.createElement('span'); s.textContent = c.title || 'Trò chuyện'; s.onclick = () => { conv = c; render(); closeDrawer(); };
    const x = document.createElement('button'); x.textContent = '🗑'; x.setAttribute('aria-label', 'Xoá');
    x.onclick = async () => { if (!confirm('Xoá cuộc trò chuyện này?')) return; await tx('readwrite', (st) => st.delete(c.id)); if (c.id === conv.id) { conv = newConv(); render(); } openDrawer(); };
    row.append(s, x); list.appendChild(row);
  }
  $('#drawer').classList.remove('hidden');
}
const closeDrawer = () => $('#drawer').classList.add('hidden');
function startNew() { if (busy) return; conv = newConv(); pending = []; renderAttached(); render(); closeDrawer(); $('#input').focus(); }

// ---------- viewer ----------
function openViewer(b) { viewing = b; $('#viewImg').src = urlOf(b); $('#viewer').classList.remove('hidden'); }
async function save() {
  if (!viewing) return;
  const file = new File([viewing], `sua-anh-${Date.now()}.${viewing.type === 'image/png' ? 'png' : 'jpg'}`, { type: viewing.type || 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { /* user closed the share sheet */ }
  } else { const a = document.createElement('a'); a.href = urlOf(viewing); a.download = file.name; a.click(); }
}

// ---------- settings ----------
function openSettings() {
  $('#setKey').value = cfg.key; $('#setBase').value = cfg.base; $('#setChatModel').value = cfg.chatModel; $('#setModel').value = cfg.model;
  $('#setQuality').value = cfg.quality; $('#setFidelity').checked = cfg.fidelity;
  $('#settings').showModal();
}
$('#btnSaveSettings').onclick = () => {
  cfg.key = $('#setKey').value.trim(); cfg.base = $('#setBase').value.trim() || DEFAULTS.base;
  cfg.chatModel = $('#setChatModel').value.trim() || DEFAULTS.chatModel; cfg.model = $('#setModel').value.trim() || DEFAULTS.model;
  cfg.quality = $('#setQuality').value; cfg.fidelity = $('#setFidelity').checked; saveCfg();
};

// ---------- wiring ----------
for (const s of SUGGEST) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = s;
  b.onclick = () => { $('#input').value = s; autoGrow(); $('#input').focus(); };
  $('#suggest').appendChild(b);
}
$('#filePick').onchange = async (e) => {
  const files = [...e.target.files]; e.target.value = '';
  for (const f of files) { try { pending.push(await shrink(f, 2048, 0.92)); } catch (err) { alert(err.message); } }
  renderAttached();
};
$('#input').addEventListener('input', autoGrow);
$('#input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); send(); } });
$('#btnSend').onclick = send;
$('#btnMenu').onclick = openDrawer; $('#btnCloseDrawer').onclick = closeDrawer;
$('#drawer').onclick = (e) => { if (e.target.id === 'drawer') closeDrawer(); };
$('#btnNew').onclick = startNew; $('#btnNew2').onclick = startNew;
$('#btnSettings').onclick = openSettings;
$('#btnSave').onclick = save;
$('#btnUse').onclick = () => { if (viewing) { pending.push(viewing); renderAttached(); } $('#viewer').classList.add('hidden'); $('#input').focus(); };
$('#btnCloseView').onclick = () => $('#viewer').classList.add('hidden');

// Private app: without a key (#k= link) only the lock screen shows.
const locked = !cfg.key;
$('#locked').classList.toggle('hidden', !locked);
for (const id of ['#app', '#composer', '#btnSettings', '#btnMenu', '#btnNew']) $(id).classList.toggle('hidden', locked);

// Open the most recent conversation.
convAll().then((all) => { if (all[0] && all[0].messages.length) conv = all[0]; render(); });
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js');
