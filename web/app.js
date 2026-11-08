// Photo Edit AI — calls the OpenAI Images API straight from the browser. No backend.
'use strict';
const $ = (s) => document.querySelector(s);

// ---------- settings (localStorage, this device only) ----------
// Default provider = CheapAI (OpenAI-compatible, CORS open, /images/edits works; probed 2026-11-08).
const DEFAULTS = { key: '', base: 'https://api.cheapai.io/v1', model: 'gpt-image-2.5', size: 'auto', fidelity: true, quality: 'auto' };
const cfg = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('cfg') || '{}'));
const saveCfg = () => localStorage.setItem('cfg', JSON.stringify(cfg));
// Ready-made link: https://.../#k=<key> — the part after # never reaches any server; the app keeps the key on this device.
// The hash stays in the URL on purpose: an iPhone Home Screen app has its own storage and reads the key from its saved URL.
const hashKey = new URLSearchParams(location.hash.slice(1)).get('k');
if (hashKey && hashKey !== cfg.key) { cfg.key = hashKey; saveCfg(); }

// ---------- presets: label shown, prompt sent (English = most reliable) ----------
const PRESETS = [
  ['Làm đẹp tự nhiên', 'Retouch this photo naturally: slightly smoother skin, even skin tone, brighter eyes, remove blemishes. Keep the person\'s identity, face shape and features exactly the same. Realistic, not plastic.'],
  ['Ánh sáng & màu đẹp', 'Improve lighting and colors like a professional photographer: balanced exposure, soft flattering light, vivid but natural colors, sharper details. Change nothing else.'],
  ['Xoá phông', 'Blur the background like a portrait lens with soft bokeh. Keep the subject sharp and unchanged.'],
  ['Đổi nền', 'Replace the background with: '],
  ['Xoá vật thừa', 'Remove these unwanted things from the photo and fill the area naturally: '],
  ['Phục hồi ảnh cũ', 'Restore this old photo: remove scratches, dust and noise, sharpen faces, natural colors (colorize if black and white). Keep everyone\'s face identical.'],
  ['Hoạt hình', 'Redraw this photo as a high-quality anime illustration, same people, pose and composition.'],
  ['Tranh vẽ', 'Turn this photo into a detailed oil painting, same people, pose and composition.'],
];

// ---------- state ----------
let src = null;       // Blob of the image being edited (null = generate new image)
let out = null;       // Blob of the last result
let busy = false;

// ---------- history (IndexedDB) ----------
const HIST_MAX = 40;
const dbp = new Promise((res, rej) => {
  const q = indexedDB.open('photo-edit-ai', 1);
  q.onupgradeneeded = () => q.result.createObjectStore('h', { keyPath: 'id' });
  q.onsuccess = () => res(q.result);
  q.onerror = () => rej(q.error);
});
const tx = async (mode, fn) => { const db = await dbp; return new Promise((res, rej) => {
  const t = db.transaction('h', mode); const r = fn(t.objectStore('h'));
  t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }); };
const histAll = async () => ((await tx('readonly', (s) => s.getAll())) || []).sort((a, b) => b.id - a.id);
async function histAdd(rec) {
  await tx('readwrite', (s) => s.put(rec));
  const all = await histAll();
  for (const old of all.slice(HIST_MAX)) await tx('readwrite', (s) => s.delete(old.id));
}

// ---------- image helpers ----------
function loadImg(blob) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh này')); i.src = URL.createObjectURL(blob); });
}
// Shrink to max 2048 px and re-encode as JPEG (also turns iPhone HEIC into a format the API accepts).
async function prep(file) {
  const img = await loadImg(file);
  const k = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
}
const b64ToBlob = (b64, type = 'image/png') => { const bin = atob(b64); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type }); };

// ---------- API ----------
async function callApi(prompt, image, signal, withFidelity) {
  const base = cfg.base.replace(/\/+$/, '');
  const headers = { Authorization: 'Bearer ' + cfg.key };
  let r;
  if (image) {
    const fd = new FormData();
    fd.append('model', cfg.model); fd.append('prompt', prompt); fd.append('n', '1');
    fd.append('size', cfg.size); fd.append('quality', cfg.quality);
    if (withFidelity) fd.append('input_fidelity', 'high');
    fd.append('image', image, 'image.jpg');
    r = await fetch(base + '/images/edits', { method: 'POST', headers, body: fd, signal });
  } else {
    r = await fetch(base + '/images/generations', { method: 'POST', signal,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.model, prompt, n: 1, size: cfg.size, quality: cfg.quality }) });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Lỗi ' + r.status)); e.status = r.status; throw e; }
  const d = j.data && j.data[0];
  if (d && d.b64_json) return b64ToBlob(d.b64_json);
  if (d && d.url) return (await fetch(d.url)).blob();
  throw new Error('API không trả ảnh');
}

async function run() {
  if (busy) return;
  const prompt = $('#prompt').value.trim();
  if (!cfg.key) { openSettings(); return setStatus('Nhập API key trước', true); }
  if (!prompt) return setStatus('Gõ yêu cầu sửa ảnh trước', true);
  busy = true; $('#btnGo').disabled = true;
  const ctl = new AbortController(); const t0 = Date.now();
  const timer = setInterval(() => setStatus(`Đang ${src ? 'sửa' : 'tạo'} ảnh... ${Math.round((Date.now() - t0) / 1000)} s (thường 20-90 s)`), 1000);
  const kill = setTimeout(() => ctl.abort(), 240000);
  try {
    let blob;
    try { blob = await callApi(prompt, src, ctl.signal, src && cfg.fidelity); }
    catch (e) { // some models do not take input_fidelity: retry once without it
      if (src && cfg.fidelity && /fidelity/i.test(e.message)) blob = await callApi(prompt, src, ctl.signal, false);
      else throw e;
    }
    out = blob;
    showResult(blob);
    await histAdd({ id: Date.now(), prompt, out: blob, src });
    renderHistory();
    setStatus(`Xong sau ${Math.round((Date.now() - t0) / 1000)} s`);
  } catch (e) {
    setStatus(e.name === 'AbortError' ? 'Quá 4 phút không có kết quả, thử lại nhé' : 'Lỗi: ' + e.message, true);
  } finally {
    clearInterval(timer); clearTimeout(kill); busy = false; $('#btnGo').disabled = false;
  }
}

// ---------- UI ----------
function setStatus(msg, err) { const s = $('#status'); s.textContent = msg; s.classList.toggle('err', !!err); }
function setSrc(blob) {
  src = blob;
  const img = $('#srcImg');
  if (img.src) URL.revokeObjectURL(img.src);
  img.src = blob ? URL.createObjectURL(blob) : '';
  $('#srcBox').classList.toggle('empty', !blob);
  $('#btnClearSrc').classList.toggle('hidden', !blob);
  $('#btnGo').textContent = blob ? 'Sửa ảnh' : 'Tạo ảnh mới';
}
let outUrl = '', origUrl = '';
function showResult(blob, original = src) {
  if (outUrl) URL.revokeObjectURL(outUrl); if (origUrl) URL.revokeObjectURL(origUrl);
  outUrl = URL.createObjectURL(blob); origUrl = original ? URL.createObjectURL(original) : '';
  $('#outImg').src = outUrl;
  $('#resultCard').classList.remove('hidden');
  $('#resultCard').scrollIntoView({ behavior: 'smooth' });
}
async function onFile(e) {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { setSrc(await prep(f)); setStatus(''); } catch (err) { setStatus(err.message, true); }
}
async function save() {
  if (!out) return;
  const file = new File([out], `sua-anh-${Date.now()}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch (e) { if (e.name !== 'AbortError') setStatus(e.message, true); }
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click();
  }
}
async function renderHistory() {
  const box = $('#history'); box.textContent = '';
  for (const h of await histAll()) {
    const img = document.createElement('img'); img.src = URL.createObjectURL(h.out); img.alt = h.prompt;
    img.onclick = () => { out = h.out; showResult(h.out, h.src); $('#prompt').value = h.prompt; };
    box.appendChild(img);
  }
}
function openSettings() {
  $('#setKey').value = cfg.key; $('#setBase').value = cfg.base; $('#setModel').value = cfg.model;
  $('#setSize').value = cfg.size; $('#setFidelity').checked = cfg.fidelity;
  $('#settings').showModal();
}

// Hold the result to see the original.
const outImg = $('#outImg');
const showOrig = (on) => { if (origUrl) outImg.src = on ? origUrl : outUrl; };
outImg.addEventListener('pointerdown', () => showOrig(true));
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => outImg.addEventListener(ev, () => showOrig(false)));

for (const [label, text] of PRESETS) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
  b.onclick = () => { const p = $('#prompt'); p.value = (p.value.trim() ? p.value.trim() + ' ' : '') + text; p.focus(); };
  $('#presets').appendChild(b);
}
$('#quality').value = cfg.quality;
$('#quality').onchange = (e) => { cfg.quality = e.target.value; saveCfg(); };
$('#filePick').onchange = onFile; $('#fileCam').onchange = onFile;
$('#btnClearSrc').onclick = () => setSrc(null);
$('#btnGo').onclick = run;
$('#btnSave').onclick = save;
$('#btnAgain').onclick = () => { if (out) { setSrc(out); $('#prompt').value = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); } };
$('#btnSettings').onclick = openSettings;
$('#btnSaveSettings').onclick = () => {
  cfg.key = $('#setKey').value.trim(); cfg.base = $('#setBase').value.trim() || DEFAULTS.base;
  cfg.model = $('#setModel').value.trim() || DEFAULTS.model; cfg.size = $('#setSize').value; cfg.fidelity = $('#setFidelity').checked;
  saveCfg(); setStatus('Đã lưu cài đặt');
};
$('#btnClearHist').onclick = async () => { if (confirm('Xoá hết lịch sử?')) { await tx('readwrite', (s) => s.clear()); renderHistory(); } };

// Private app: without an invite key (#k= link) only the lock screen shows.
const locked = !cfg.key;
$('#locked').classList.toggle('hidden', !locked);
$('#app').classList.toggle('hidden', locked);
$('#btnSettings').classList.toggle('hidden', locked);

setSrc(null);
renderHistory();
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js');
