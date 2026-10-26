// ─── State & Helpers ────────────────────────────────────────────────────────
let DB = null;
let EP = {};

const store = {
  get(k, d) { try { const v = localStorage.getItem('df_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('df_' + k, JSON.stringify(v)); } catch (e) {} }
};
const getW   = () => store.get('w', {});
function setW(code, on)     { const w = getW(); if (on) w[code] = Date.now(); else delete w[code]; store.set('w', w); }
function setLast(pl, code)  { const l = store.get('last', {}); l[pl] = code; store.set('last', l); }
const EMB = c => 'https://www.dubbindo.site/embed/' + c;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cover(e) {
  const img = e.th ? `<img src="${e.th}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" alt="">` : '';
  return `<div class="cov"><div class="ph">▶</div>${img}<span class="cnt">${e.n} EPS</span></div>`;
}
function ecard(pl, e, i) {
  const w   = getW()[e.c] ? `<span class="wt">✓</span>` : '';
  const img = e.th ? `<img src="${e.th}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" alt="">` : '';
  return `<div class="ecard" onclick="location.hash='#/w/${e.c}'">
    <div class="th"><div class="ph">▶</div>${img}<span class="num">EPS ${i + 1}</span>${w}</div>
    <div class="ti"><b>${e.s}</b></div></div>`;
}
function plById(id)   { return DB.playlists.find(p => p.id === id); }
function progHTML(p)  {
  const w = getW(); const n = p.eps.filter(e => w[e.c]).length;
  const pct = Math.round(n / p.eps.length * 100);
  return { n, pct, bar: `<div class="prog"><i style="width:${pct}%"></i></div><div class="pct">${n}/${p.eps.length} ditonton</div>` };
}

// ─── Render: Home ────────────────────────────────────────────────────────────
function renderHome() {
  document.title = 'DubFlix — Nonton Dub Indo';
  const total = DB.playlists.reduce((a, p) => a + p.eps.length, 0);
  const last  = store.get('last', {});
  let cont    = '';
  const items = [];
  DB.playlists.forEach(p => {
    const c = last[p.id];
    if (c && EP[c]) items.push({ p, e: EP[c], i: EP[c].i });
  });
  if (items.length) {
    cont = `<h2 class="sec"><span class="bar"></span>Lanjutkan Menonton</h2>
      <div class="grid">${items.map(({ p, e, i }) =>
        `<div class="ecard" onclick="location.hash='#/w/${e.c}'">
          <div class="th"><div class="ph">▶</div>${e.th ? `<img src="${e.th}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" alt="">` : ''}<span class="num">${p.short}</span></div>
          <div class="ti"><b>EPS ${i + 1}</b> — ${e.s}</div></div>`).join('')}
      </div>`;
  }
  const cards = DB.playlists.map(p => {
    const pr    = progHTML(p);
    const first = p.eps[0];
    return `<div class="pcard" onclick="location.hash='#/p/${p.id}'">
      ${cover({ th: first.th, n: p.eps.length })}
      <div class="inf"><h3>${p.name}</h3>${pr.bar}</div></div>`;
  }).join('');
  app.innerHTML = `
    <div class="hero">
      <h1>Nonton <b>Dub Indo</b><br>Kapan Aja, Di Mana Aja.</h1>
      <p>Koleksi Ben 10 Alien Force &amp; Omniverse lengkap dubbing Indonesia. Klik, tonton, lanjutkan kapan pun — progres nontonmu tersimpan otomatis.</p>
      <div class="stats">
        <div class="stat"><b>${total}</b><span>Episode</span></div>
        <div class="stat"><b>${DB.playlists.length}</b><span>Playlist</span></div>
      </div>
      <button class="btn" onclick="location.hash='#/p/${DB.playlists[0].id}'">▶ Mulai dari Awal</button>
    </div>
    ${cont}
    <h2 class="sec"><span class="bar"></span>Semua Playlist</h2>
    <div class="grid">${cards}</div>`;
}

// ─── Render: Playlist ────────────────────────────────────────────────────────
function renderPlaylist(id) {
  const p = plById(id);
  if (!p) { location.hash = '#/'; return; }
  document.title = p.name + ' — DubFlix';
  const pr = progHTML(p);
  app.innerHTML = `
    <div class="back" onclick="location.hash='#/'">← Semua Playlist</div>
    <div class="ptitle">${p.name}</div>
    <div class="psub">${p.eps.length} episode • ${pr.n} ditonton (${pr.pct}%) • Dub Indonesia</div>
    <div class="grid">${p.eps.map((e, i) => ecard(p, e, i)).join('')}</div>`;
}

// ─── Render: Watch ───────────────────────────────────────────────────────────
let watchTimer = null;
// Update status "ditonton" TANPA me-render ulang halaman.
// (Bug lama: renderWatch() dipanggil ulang setelah 60 detik & saat tombol
//  ditandai ditekan -> elemen <video> dibuat dari nol -> putar ulang dari awal.)
function updateWButton(code) {
  const btn = document.getElementById('wbtn');
  if (!btn) return;
  const on = !!getW()[code];
  btn.className = on ? 'done' : '';
  btn.textContent = on ? '✓ Sudah Ditonton' : 'Tandai Ditonton';
}
function markRowWatched(code) {
  document.querySelectorAll('.eprow.cur').forEach(r => {
    if (!r.querySelector('.ck')) {
      const s = document.createElement('span');
      s.className = 'ck'; s.textContent = '✓';
      r.appendChild(s);
    }
  });
}
function markWatched(code) {
  setW(code, true);
  updateWButton(code);
  markRowWatched(code);
}
function toggleW(code) {
  setW(code, !getW()[code]);
  updateWButton(code);
  if (getW()[code]) markRowWatched(code);
}
function renderWatch(code) {
  const info = EP[code];
  if (!info) { location.hash = '#/'; return; }
  const p    = plById(info.pl);
  const e    = p.eps[info.i];
  setLast(p.id, code);
  document.title = e.t + ' — DubFlix';
  const prev = info.i > 0             ? p.eps[info.i - 1] : null;
  const next = info.i < p.eps.length - 1 ? p.eps[info.i + 1] : null;
  const isW  = !!getW()[code];
  if (watchTimer) clearTimeout(watchTimer);
  watchTimer = setTimeout(() => {
    // Cukup tandai sebagai ditonton — JANGAN render ulang (player ke-reset).
    if ((location.hash || '') === '#/w/' + code) markWatched(code);
  }, 60000);
  const qs    = ['1080', '720', '480', '360', '240'].filter(q => e.v && e.v[q]);
  const prefQ = store.get('q', '720');
  const curQ  = (e.v && e.v[prefQ]) ? prefQ : qs[0];
  const qbtns = qs.map(q => `<button class="${q === curQ ? 'on' : ''}" onclick="setQ('${code}','${q}')">${q}p</button>`).join('');
  const rows  = p.eps.map((x, i) => {
    const w   = getW()[x.c] ? `<span class="ck">✓</span>` : '';
    const img = x.th ? `<img src="${x.th}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" alt="">` : '';
    return `<div class="eprow ${x.c === code ? 'cur' : ''}" onclick="location.hash='#/w/${x.c}'">
      ${img}<span class="n">${i + 1}</span><span class="t">${x.s}</span>${w}</div>`;
  }).join('');
  app.innerHTML = `
    <div class="back" onclick="location.hash='#/p/${p.id}'">← ${p.name}</div>
    <div class="player"><video id="vid" controls playsinline preload="metadata" poster="${e.th || ''}" src="${e.v[curQ]}"></video></div>
    <div class="qrow"><span>Kualitas:</span>${qbtns}</div>
    <div class="srow"><span>Subtitle:</span><span class="st" id="substat">…</span><button onclick="subSearch('${code}')">🔍 Cari Subtitle Indonesia</button><button id="suboff" onclick="subOff()" style="display:none">Matikan</button></div>
    <div id="subpanel"></div>
    <div class="winfo">
      <h2>EPS ${info.i + 1} — ${e.s}</h2>
      <div class="wnav">
        <button ${prev ? `onclick="location.hash='#/w/${prev.c}'"` : 'disabled'}>← Prev</button>
        <button id="wbtn" onclick="toggleW('${code}')" class="${isW ? 'done' : ''}">${isW ? '✓ Sudah Ditonton' : 'Tandai Ditonton'}</button>
        <button ${next ? `onclick="location.hash='#/w/${next.c}'"` : 'disabled'}>Next →</button>
      </div>
    </div>
    <h2 class="sec"><span class="bar"></span>Episode Lainnya — ${p.short}</h2>
    <div class="eplist">${rows}</div>`;
  // Simpan posisi putar tiap 5 detik & pulihkan saat halaman dibuka lagi,
  // jadi kalaupun player/browser ke-reload, tidak mulai dari awal.
  const vid = document.getElementById('vid');
  if (vid) {
    const saved = store.get('pos', {})[code];
    if (saved && saved > 5) {
      vid.addEventListener('loadedmetadata', () => {
        try { if (vid.duration && saved < vid.duration - 5) vid.currentTime = saved; } catch (err) {}
      }, { once: true });
    }
    let lastSave = 0;
    vid.addEventListener('timeupdate', () => {
      const now = Date.now();
      if (now - lastSave < 5000) return;
      lastSave = now;
      const pos = store.get('pos', {});
      if (vid.currentTime > 5 && vid.duration && vid.currentTime < vid.duration - 10) pos[code] = Math.floor(vid.currentTime);
      else delete pos[code];
      store.set('pos', pos);
    });
    vid.addEventListener('ended', () => {
      const pos = store.get('pos', {});
      delete pos[code];
      store.set('pos', pos);
      markWatched(code);
    });
    subInit(code, p, e, info);
  }
}

// ─── Subtitle: bawaan + pencarian online (OpenSubtitles) ────────────────────
// Metadata pencarian per playlist: judul seri + nomor season di database subtitle.
const SUB_META = {
  '2Ruq2ULIPAi9cdK': { q: 'Ben 10 Alien Force', s: 1 }, 'Psr8oZV5KKb4rhF': { q: 'Ben 10 Alien Force', s: 2 },
  'vqGlBBetTcA8yYg': { q: 'Ben 10 Alien Force', s: 3 },
  'ultimate-alien-s1': { q: 'Ben 10 Ultimate Alien', s: 1 },
  'ultimate-alien-s1-en': { q: 'Ben 10 Ultimate Alien', s: 1 },
  'ultimate-alien-s2-en': { q: 'Ben 10 Ultimate Alien', s: 2 },
  'ultimate-alien-s3-en': { q: 'Ben 10 Ultimate Alien', s: 3 },
  'classic-s1': { q: 'Ben 10', s: 1 }, 'classic-s2': { q: 'Ben 10', s: 2 },
  'classic-s3': { q: 'Ben 10', s: 3 }, 'classic-s4': { q: 'Ben 10', s: 4 },
  'Gwe6Ikh2CNQk2Ql': { q: 'Ben 10 Omniverse', s: 2 }, '74UmHRrHoZbHEQ3': { q: 'Ben 10 Omniverse', s: 3 },
  'FgZ71cUz4MpB73T': { q: 'Ben 10 Omniverse', s: 4 }, 'jm77zbfSlcTxWje': { q: 'Ben 10 Omniverse', s: 5 },
  'ToonfV1Lrwgly36': { q: 'Ben 10 Omniverse', s: 6 }, 'iwyBxUKHrTJhhjG': { q: 'Ben 10 Omniverse', s: 7 },
  'Zc9VZxmzb2rqXsR': { q: 'Ben 10 Omniverse', s: 8 }
};
let subState = { code: null, meta: null, epNo: 0 };
let subLastItems = null;

function srtToVtt(txt) {
  let t = String(txt).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  t = t.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  t = t.replace(/^(\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3})[^\n]*$/gm, '$1');
  if (!/^WEBVTT/.test(t)) t = 'WEBVTT\n\n' + t.replace(/^\s+/, '');
  return t;
}
function subStatus(msg) { const el = document.getElementById('substat'); if (el) el.textContent = msg; }
function subApply(src, label, lang, isText) {
  const v = document.getElementById('vid'); if (!v) return;
  v.querySelectorAll('track.dynsub').forEach(t => t.remove());
  const tr = document.createElement('track');
  tr.className = 'dynsub'; tr.kind = 'subtitles'; tr.label = label; tr.srclang = lang || 'id'; tr.default = true;
  tr.src = isText ? URL.createObjectURL(new Blob([srtToVtt(src)], { type: 'text/vtt' })) : src;
  v.appendChild(tr);
  const show = () => { try { if (tr.track) tr.track.mode = 'showing'; } catch (err) {} };
  tr.addEventListener('load', show); show(); setTimeout(show, 600);
  const off = document.getElementById('suboff'); if (off) off.style.display = '';
  subStatus(label + ' — aktif ✓');
}
function subOff() {
  const v = document.getElementById('vid'); if (!v) return;
  for (const t of v.textTracks) t.mode = 'disabled';
  const off = document.getElementById('suboff'); if (off) off.style.display = 'none';
  subStatus('Mati');
}
function subInit(code, p, e, info) {
  subState = { code, meta: SUB_META[p.id] || null, epNo: info.i + 1 };
  if (e.sub) {
    subApply(e.sub, 'Indonesia (bawaan)', 'id', false);
    if (e.suben) {
      const v = document.getElementById('vid');
      if (v) {
        const tr = document.createElement('track');
        tr.className = 'dynsub'; tr.kind = 'subtitles'; tr.label = 'English (bawaan)'; tr.srclang = 'en'; tr.src = e.suben;
        v.appendChild(tr);
        setTimeout(() => { try { if (tr.track) tr.track.mode = 'hidden'; } catch (err) {} }, 600);
      }
    }
    return;
  }
  const cache = store.get('subcache', {})[code];
  if (cache && cache.text) { subApply(cache.text, cache.label, cache.lang, true); return; }
  if (store.get('oskey', '')) { subStatus('Mencari subtitle Indonesia…'); subFetchList(true); }
  else subStatus('Belum ada — klik Cari Subtitle');
}
async function subFetchList(auto) {
  const key = store.get('oskey', '');
  const panel = document.getElementById('subpanel');
  if (!key) { subShowKeyForm(); return null; }
  if (!subState.meta) { subStatus('Seri ini belum ada metadata pencarian'); return null; }
  const { q, s } = subState.meta, ep = subState.epNo;
  const url = 'https://api.opensubtitles.com/api/v1/subtitles?query=' + encodeURIComponent(q) +
    '&season_number=' + s + '&episode_number=' + ep + '&languages=id,en&order_by=download_count&order_direction=desc';
  let res;
  try {
    res = await fetch(url, { headers: { 'Api-Key': key, 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch (err) {
    subStatus('Pencarian gagal (' + err.message + ') — cek API key/koneksi');
    return null;
  }
  const data = await res.json().catch(() => null);
  const items = ((data && data.data) || []).filter(x => x.attributes && x.attributes.files && x.attributes.files.length);
  if (!items.length) { subStatus('Subtitle tidak ditemukan untuk episode ini'); if (panel) panel.innerHTML = ''; return null; }
  items.sort((a, b) => ((b.attributes.language === 'id') - (a.attributes.language === 'id')) ||
    ((b.attributes.download_count || 0) - (a.attributes.download_count || 0)));
  subLastItems = items;
  if (auto) { await subPick(items[0].attributes.files[0].file_id); return items; }
  if (panel) panel.innerHTML = '<div class="box"><b>Pilih subtitle</b> — ' + esc(q) + ' S' + s + 'E' + ep +
    items.map((x, i) => { const a = x.attributes; return `<button class="sres" onclick="subPick(${a.files[0].file_id}, ${i})"><span>${esc(a.release || a.files[0].file_name || 'subtitle')}</span><small>${a.language === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'} • ⬇ ${a.download_count || 0}</small></button>`; }).join('') + '</div>';
  return items;
}
async function subSearch(code) {
  if (!store.get('oskey', '')) { subShowKeyForm(); return; }
  subStatus('Mencari subtitle…');
  await subFetchList(false);
  subStatus('Pilih subtitle di bawah 👇');
}
function subShowKeyForm() {
  const panel = document.getElementById('subpanel'); if (!panel) return;
  subStatus('Butuh API key OpenSubtitles (gratis, sekali atur)');
  panel.innerHTML = `<div class="box"><b>Cari Subtitle Otomatis — sekali pengaturan</b><br>
    1. Daftar gratis di <a href="https://www.opensubtitles.com/en/users/sign_up" target="_blank" rel="noopener">opensubtitles.com</a><br>
    2. Buka <a href="https://www.opensubtitles.com/en/consumers" target="_blank" rel="noopener">API Consumers</a> → buat consumer → salin <b>API Key</b>-nya<br>
    3. Tempel di sini (tersimpan di browser ini saja, tidak dikirim ke mana-mana selain OpenSubtitles):
    <input id="oskeyin" placeholder="tempel API key di sini" autocomplete="off">
    <button onclick="subSaveKey()">Simpan &amp; Cari Subtitle</button></div>`;
}
function subSaveKey() {
  const v = (document.getElementById('oskeyin') || {}).value || '';
  if (!v.trim()) return;
  store.set('oskey', v.trim());
  const panel = document.getElementById('subpanel'); if (panel) panel.innerHTML = '';
  subStatus('Mencari subtitle Indonesia…');
  subFetchList(true);
}
async function subPick(fileId) {
  const key = store.get('oskey', '');
  subStatus('Mengunduh subtitle…');
  try {
    const res = await fetch('https://api.opensubtitles.com/api/v1/download', {
      method: 'POST',
      headers: { 'Api-Key': key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ file_id: fileId, sub_format: 'srt' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    const txt = await (await fetch(d.link)).text();
    const item = (subLastItems || []).find(x => x.attributes.files[0].file_id === fileId);
    const lang = item ? item.attributes.language : 'id';
    const label = (lang === 'id' ? 'Indonesia' : 'English') + ' (online)';
    const cache = store.get('subcache', {}); cache[subState.code] = { text: txt, label, lang }; store.set('subcache', cache);
    const panel = document.getElementById('subpanel'); if (panel) panel.innerHTML = '';
    subApply(txt, label, lang, true);
  } catch (err) { subStatus('Unduh gagal (' + err.message + ')'); }
}

// ─── Render: Search ──────────────────────────────────────────────────────────
function renderSearch(q) {
  document.title = 'Cari: ' + q + ' — DubFlix';
  const ql  = q.toLowerCase();
  const res = [];
  DB.playlists.forEach(p => p.eps.forEach((e, i) => {
    if (e.t.toLowerCase().includes(ql)) res.push({ p, e, i });
  }));
  app.innerHTML = `
    <div class="back" onclick="location.hash='#/'">← Beranda</div>
    <div class="ptitle">Hasil pencarian: "${esc(q)}"</div>
    <div class="psub">${res.length} episode ditemukan</div>
    ${res.length
      ? `<div class="grid">${res.map(({ p, e, i }) =>
          `<div class="ecard" onclick="location.hash='#/w/${e.c}'">
            <div class="th"><div class="ph">▶</div>${e.th ? `<img src="${e.th}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" alt="">` : ''}<span class="num">${p.short} • EPS ${i + 1}</span></div>
            <div class="ti"><b>${e.s}</b></div></div>`).join('')}</div>`
      : `<div class="empty">😕 Nggak ketemu episode yang cocok.<br>Coba kata kunci lain.</div>`}`;
}

// ─── Quality Switcher ────────────────────────────────────────────────────────
function setQ(code, q) {
  const info = EP[code]; if (!info) return;
  const e = plById(info.pl).eps[info.i];
  if (!e.v || !e.v[q]) return;
  store.set('q', q);
  document.querySelectorAll('.qrow button').forEach(b => b.classList.toggle('on', b.textContent === q + 'p'));
  const v = document.getElementById('vid'); if (!v) return;
  const t = v.currentTime;
  const resume = () => { try { v.currentTime = t; } catch (err) {} v.play().catch(() => {}); };
  v.addEventListener('loadedmetadata', resume, { once: true });
  v.src = e.v[q];
  v.load();
}

// ─── Search Input ────────────────────────────────────────────────────────────
function goSearch() {
  const q = document.getElementById('q').value.trim();
  if (q) location.hash = '#/s/' + encodeURIComponent(q);
}

// ─── Router ──────────────────────────────────────────────────────────────────
function route() {
  const h = location.hash || '#/';
  window.scrollTo(0, 0);
  let m;
  if (m = h.match(/^#\/p\/([\w-]+)/)) return renderPlaylist(m[1]);
  if (m = h.match(/^#\/w\/([\w-]+)/)) return renderWatch(m[1]);
  if (m = h.match(/^#\/s\/(.+)/))     return renderSearch(decodeURIComponent(m[1]));
  return renderHome();
}

// ─── Bootstrap: Load data.json then start app ────────────────────────────────
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    DB = data;
    // Build EP lookup index
    DB.playlists.forEach(p => p.eps.forEach((e, i) => EP[e.c] = { pl: p.id, i, t: e.t, th: e.th }));
    window.addEventListener('hashchange', route);
    route();
  })
  .catch(err => {
    document.getElementById('app').innerHTML =
      `<div class="empty">⚠️ Gagal memuat data. Pastikan file <code>data.json</code> tersedia.<br><small>${err}</small></div>`;
  });