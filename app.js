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
    if ((location.hash || '') === '#/w/' + code) { setW(code, true); renderWatch(code); }
  }, 60000);
  const qs    = ['720', '480', '360', '240'].filter(q => e.v && e.v[q]);
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
    <div class="winfo">
      <h2>EPS ${info.i + 1} — ${e.s}</h2>
      <div class="wnav">
        <button ${prev ? `onclick="location.hash='#/w/${prev.c}'"` : 'disabled'}>← Prev</button>
        <button onclick="setW('${code}',${!isW});renderWatch('${code}')" class="${isW ? 'done' : ''}">${isW ? '✓ Sudah Ditonton' : 'Tandai Ditonton'}</button>
        <button ${next ? `onclick="location.hash='#/w/${next.c}'"` : 'disabled'}>Next →</button>
      </div>
    </div>
    <h2 class="sec"><span class="bar"></span>Episode Lainnya — ${p.short}</h2>
    <div class="eplist">${rows}</div>`;
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