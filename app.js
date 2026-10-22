// Moatassim Health - iPhone app (home-screen web app)
(function () {
  'use strict';
  const APP_VERSION = '1.0.0';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const app = $('#app');

  // ---------------------------------------------------------------- helpers
  const pad2 = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const dateOf = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());
  const longDate = k => dateOf(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = k => dateOf(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const fmt = (v, d = 0) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtSmart = v => v == null ? '–' : (v >= 100 ? fmt(v) : v >= 10 ? fmt(v, 1).replace(/\.0$/, '') : fmt(v, 2).replace(/\.?0+$/, ''));
  const hm = sec => sec == null ? '–' : `${Math.floor(sec / 3600)}h ${pad2(Math.round(sec % 3600 / 60))}m`;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const unitOf = f => (f && f.unit === 'ml') ? 'ml' : 'g';
  const fmtAmt = (v, u) => u === 'ml' && v >= 1000 ? fmt(v / 1000, 2).replace(/\.?0+$/, '') + ' L' : fmt(v) + ' ' + u;
  const fmtCount = n => { const w = Math.floor(n), h = Math.round((n - w) * 4); const fr = ['', '¼', '½', '¾'][h] ?? ''; return h === 4 ? String(w + 1) : (w ? String(w) : (fr ? '' : '0')) + fr; };
  const countLabel = (n, each) => `${fmtCount(n)} ${n > 0 && n <= 1 ? each.one : each.many}`;
  const entryAmount = e => e.count != null && e.each ? countLabel(e.count, e.each) : fmtAmt(e.grams, unitOf(e));
  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const guessMeal = () => { const h = new Date().getHours(); return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks'; };

  // ---------------------------------------------------------------- nutrients
  const NKEYS = ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 've', 'vk', 'b6', 'b12', 'fol', 'se', 'io', 'ph', 'cu', 'b1', 'b2', 'b3', 'ch', 'epa', 'la', 'ala'];
  const MICROS = [
    ['fib', 'Fibre', 'g'], ['sug', 'Sugars', 'g', 1], ['sat', 'Saturated fat', 'g', 1], ['salt', 'Salt', 'g', 1],
    ['k', 'Potassium', 'mg'], ['ca', 'Calcium', 'mg'], ['fe', 'Iron', 'mg'], ['mg', 'Magnesium', 'mg'], ['zn', 'Zinc', 'mg'],
    ['ph', 'Phosphorus', 'mg'], ['se', 'Selenium', 'µg'], ['io', 'Iodine', 'µg'], ['cu', 'Copper', 'mg'],
    ['va', 'Vitamin A', 'µg'], ['vc', 'Vitamin C', 'mg'], ['vd', 'Vitamin D', 'µg'], ['ve', 'Vitamin E', 'mg'], ['vk', 'Vitamin K', 'µg'],
    ['b1', 'Vitamin B1', 'mg'], ['b2', 'Vitamin B2', 'mg'], ['b3', 'Vitamin B3', 'mg'], ['b6', 'Vitamin B6', 'mg'], ['b12', 'Vitamin B12', 'µg'],
    ['fol', 'Folate', 'µg'], ['ch', 'Choline', 'mg'], ['epa', 'Omega-3 EPA + DHA', 'mg'], ['ala', 'Omega-3 ALA', 'g'], ['la', 'Omega-6', 'g']
  ];
  function microTargets(p) {
    const male = (p.profile || {}).sex !== 'female';
    return { sug: 90, sat: male ? 30 : 20, salt: 6, fib: 30, k: 3500, ca: 1000, fe: male ? 8.7 : 14.8, mg: male ? 400 : 310, zn: male ? 11 : 8,
      va: male ? 900 : 700, vc: male ? 90 : 75, vd: 10, ve: 15, vk: male ? 120 : 90, b6: male ? 1.4 : 1.2, b12: 2.4, fol: 400,
      ph: 700, se: male ? 75 : 60, io: 150, cu: male ? 1.2 : 1.0, b1: male ? 1.2 : 1.1, b2: male ? 1.3 : 1.1, b3: male ? 16 : 14, ch: male ? 550 : 425,
      epa: 250, ala: male ? 1.6 : 1.1, la: male ? 17 : 12 };
  }
  function autoTargets(pr) {
    pr = { sex: 'male', age: 30, heightCm: 175, weightKg: 75, activity: 1.55, goal: 'maintain', proteinPerKg: 1.6, fatPct: 30, ...(pr || {}) };
    const bmr = 10 * pr.weightKg + 6.25 * pr.heightCm - 5 * pr.age + (pr.sex === 'female' ? -161 : 5);
    const adj = pr.goal === 'lose' ? -500 : pr.goal === 'lose-slow' ? -250 : pr.goal === 'gain' ? 300 : 0;
    const kcal = Math.round((bmr * pr.activity + adj) / 10) * 10, p = Math.round(pr.proteinPerKg * pr.weightKg), f = Math.round(kcal * (pr.fatPct / 100) / 9);
    return { kcal, p, c: Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4)), f };
  }
  const targetsFor = p => p.targets && p.targets.auto === false ? p.targets : autoTargets(p.profile);
  const BUILTIN = (window.BUILTIN_FOODS || []).map(f => ({ ...f, source: 'Built-in' }));
  const BY_NAME = Object.fromEntries(BUILTIN.map(f => [f.name, f]));
  function totalsOf(entries) {
    const t = { grams: 0, missing: {} };
    for (const k of NKEYS) t[k] = 0;
    for (const e of entries || []) {
      t.grams += e.grams;
      for (const k of NKEYS) {
        let v = e.n[k];
        if (v === undefined && (!e.source || e.source === 'Built-in')) { const b = BY_NAME[e.name]; v = b ? b.n[k] : null; }
        if (v == null) { t.missing[k] = 1; continue; }
        t[k] += v * e.grams / 100;
      }
    }
    t.salt = t.na * 2.5 / 1000;
    return t;
  }

  // ---------------------------------------------------------------- storage + sync
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const CFG = window.MH_CONFIG || {};
  let auth = LS.get('mh.auth', null);          // { url, key, email }
  let S = LS.get('mh.state', { profiles: {}, customFoods: [], activeProfile: null });
  let syncState = { busy: false, last: LS.get('mh.lastSync', null), error: null };
  let engine = null;

  const P = () => S.profiles[S.activeProfile] || null;
  function ensureActive() {
    const ids = Object.keys(S.profiles);
    if (!S.profiles[S.activeProfile]) S.activeProfile = ids.includes('moatassim') ? 'moatassim' : ids[0] || null;
  }
  let saveT = null;
  function persist() { LS.set('mh.state', S); }
  function changed() { persist(); clearTimeout(saveT); saveT = setTimeout(sync, 1200); }

  function makeEngine() {
    if (!auth) return null;
    const supa = new MHSync.Supa({ url: auth.url, key: auth.key });
    return new MHSync.SyncEngine(supa, {
      getState: () => S,
      setState: (ns) => { const a = S.activeProfile; S = ns; S.activeProfile = a; ensureActive(); persist(); if (!sheetOpen()) render(); else pendingRender = true; },
      loadMeta: () => LS.get('mh.meta', {}),
      saveMeta: (m) => LS.set('mh.meta', m)
    });
  }
  async function sync() {
    if (!engine) return;
    syncState.busy = true; renderSyncPill();
    try {
      await engine.run();
      syncState = { busy: false, last: new Date().toISOString(), error: null };
      LS.set('mh.lastSync', syncState.last);
    } catch (e) {
      syncState = { ...syncState, busy: false, error: e.offline ? 'offline' : (e.status === 401 || e.status === 400) ? 'signin' : e.message };
      if (syncState.error === 'signin') { toast('Please sign in again.'); }
    }
    renderSyncPill();
  }
  function renderSyncPill() {
    const el = $('#syncPill'); if (!el) return;
    const s = syncState;
    el.innerHTML = s.busy ? '<i></i>Syncing…' : s.error === 'offline' ? '<i class="bad"></i>Offline: changes are saved and will sync later' : s.error ? `<i class="bad"></i>${esc(s.error === 'signin' ? 'Sign in again in More' : 'Sync problem: ' + s.error)}` : s.last ? `<i class="ok"></i>Synced ${new Date(s.last).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '<i></i>Not synced yet';
  }

  // ---------------------------------------------------------------- shell
  const UI = { tab: 'today', date: todayKey(), showMicros: false };
  let pendingRender = false;
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    if (b.dataset.tab === 'scan') { startScan(guessMeal()); return; }
    UI.tab = b.dataset.tab; render(); window.scrollTo(0, 0);
  });

  function header(withDate = true) {
    const people = Object.values(S.profiles);
    const k = UI.date, isToday = k === todayKey();
    return `<div class="top">
      <div class="who">${people.map(p => `<button class="${p.id === S.activeProfile ? 'on' : ''}" data-act="who" data-id="${esc(p.id)}"><span class="dot" style="background:${esc(p.color || '#1E7656')}"></span>${esc(p.name || p.id)}</button>`).join('')}</div>
      ${withDate ? `<div class="dayrow"><button class="iconbtn" data-act="day" data-d="-1" aria-label="Previous day">‹</button>
        <div class="daylabel" data-act="today-jump"><b>${isToday ? 'Today' : esc(dateOf(k).toLocaleDateString('en-GB', { weekday: 'long' }))}</b><span>${esc(dateOf(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }))}${isToday ? '' : ' · tap for today'}</span></div>
        <button class="iconbtn" data-act="day" data-d="1" aria-label="Next day" ${isToday ? 'disabled' : ''}>›</button></div>` : ''}
    </div>`;
  }

  function render() {
    ensureActive();
    document.querySelectorAll('#tabbar button[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.tab));
    if (!auth) { $('#tabbar').hidden = true; return renderLogin(); }
    $('#tabbar').hidden = false;
    if (!P()) { app.innerHTML = `<div class="login"><h1>Getting your data…</h1><p class="muted">Loading Moatassim and Waifu from your PC. Make sure Phone sync is turned on in the PC app (Settings › Phone app sync).</p><div class="sync-pill" id="syncPill"></div><button class="btn block" style="margin-top:16px" data-act="sync-now">Try again</button></div>`; renderSyncPill(); return; }
    if (UI.tab === 'today') renderToday();
    else if (UI.tab === 'compare') renderCompare();
    else if (UI.tab === 'weight') renderWeight();
    else renderMore();
    renderSyncPill();
  }

  // ---------------------------------------------------------------- login
  function renderLogin(err) {
    const needCfg = !(CFG.url && CFG.key);
    app.innerHTML = `<div class="login">
      <img class="logo" src="icons/icon-180.png" alt="">
      <h1>Moatassim Health</h1>
      <p class="muted">Sign in with the app login you made in Supabase. It's the same one the PC app uses.</p>
      ${needCfg ? `<label class="f">Supabase Project URL<input type="text" id="lUrl" placeholder="https://xxxx.supabase.co" autocapitalize="off" autocorrect="off"></label>
      <label class="f">Publishable key<input type="text" id="lKey" placeholder="sb_publishable_…" autocapitalize="off" autocorrect="off"></label>` : ''}
      <label class="f">Email<input type="email" id="lEmail" autocomplete="username" autocapitalize="off"></label>
      <label class="f">Password<input type="password" id="lPass" autocomplete="current-password"></label>
      <button class="btn primary block" style="margin-top:18px" data-act="login">Sign in</button>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}
      <p class="faint small" style="margin-top:24px">Tip: in Safari, tap Share › Add to Home Screen to use this like an app.</p>
    </div>`;
  }
  async function doLogin() {
    const url = CFG.url || ($('#lUrl').value || '').trim().replace(/\/+$/, '');
    const key = CFG.key || ($('#lKey').value || '').trim();
    const email = $('#lEmail').value.trim(), pass = $('#lPass').value;
    if (!url || !key || !email || !pass) return renderLogin('Fill in all the boxes.');
    const btn = $('[data-act="login"]'); btn.disabled = true; btn.textContent = 'Signing in…';
    const supa = new MHSync.Supa({ url, key });
    try { await supa.signIn(email, pass); }
    catch (e) { return renderLogin(e.offline ? 'Could not connect. Check your internet.' : e.message); }
    auth = { url, key, email };
    LS.set('mh.auth', auth);
    LS.set('mh.meta', { shadow: {}, cursor: null, session: supa.session });
    engine = makeEngine();
    render();
    await sync();
    render();
  }

  // ---------------------------------------------------------------- today
  function barRow(cls, label, v, target, unit) {
    const pct = target ? Math.min(100, v / target * 100) : 0;
    return `<div class="mrow"><span>${label}</span><div class="bar ${cls}"><i style="width:${pct}%"></i></div><span class="v">${fmt(v)}<span class="faint"> / ${fmt(target)}${unit}</span></span></div>`;
  }
  function renderToday() {
    const p = P(), k = UI.date, entries = p.diary[k] || [], t = totalsOf(entries), tg = targetsFor(p), mt = microTargets(p);
    const left = tg.kcal - t.kcal, g = p.garmin && p.garmin.days && p.garmin.days[k];
    const meals = MEALS.map(m => {
      const list = entries.filter(e => e.meal === m);
      return `<div class="meal"><div class="meal-head"><h3>${m}</h3><span class="faint num">${list.length ? fmt(totalsOf(list).kcal) + ' kcal' : ''}</span></div>
        ${list.map(e => `<div class="entry" data-act="edit" data-id="${esc(e.id)}"><span class="n">${esc(e.name)}</span><span class="k">${fmt(e.n.kcal * e.grams / 100)}</span><span class="s">${esc(entryAmount(e))}</span><span class="m">${fmt((e.n.p || 0) * e.grams / 100, 1)}P · ${fmt((e.n.c || 0) * e.grams / 100, 1)}C · ${fmt((e.n.f || 0) * e.grams / 100, 1)}F</span></div>`).join('')}
        <button class="addline" data-act="add" data-meal="${m}">+ Add to ${m.toLowerCase()}</button></div>`;
    }).join('');
    const micros = MICROS.map(([k2, name, unit, limit]) => {
      const v = t[k2], tgt = mt[k2], pct = tgt ? v / tgt * 100 : 0;
      return `<div class="mrow" style="grid-template-columns:1fr auto"><span>${name}</span><span class="v small">${fmtSmart(v)} / ${limit ? 'max ' : ''}${fmtSmart(tgt)} ${unit} <span class="faint">${fmt(pct)}%</span></span><div class="bar ${limit ? 'limit' : pct < 70 ? 'low' : ''}" style="grid-column:1/-1;height:6px"><i style="width:${Math.min(100, pct)}%"></i></div></div>`;
    });
    const done = p.dayMeta && p.dayMeta[k] && p.dayMeta[k].complete;
    app.innerHTML = header() + `<div class="page">
      <div class="readout ${t.kcal > tg.kcal * 1.05 ? 'over' : ''}">
        <div class="lbl"><span>EATEN</span><span>TARGET ${fmt(tg.kcal)}</span></div>
        <div class="big">${fmt(t.kcal)}<small>kcal</small></div>
        <div class="foot"><span>${left >= 0 ? `<b>${fmt(left)}</b> left` : `<b>${fmt(-left)}</b> over`}</span><span>${g && g.kcalTotal ? `<b>${fmt(g.kcalTotal)}</b> burned` : `<b>${fmt(t.grams)}</b> g of food`}</span></div>
      </div>
      <div class="card">
        ${barRow('pro', 'Protein', t.p, tg.p, ' g')}${barRow('carb', 'Carbs', t.c, tg.c, ' g')}${barRow('fat', 'Fat', t.f, tg.f, ' g')}
        ${g ? `<div class="faint small" style="margin-top:8px">${[g.sleepSec ? 'Sleep ' + hm(g.sleepSec) : '', g.steps != null ? fmt(g.steps) + ' steps' : '', g.restingHr ? fmt(g.restingHr) + ' resting bpm' : ''].filter(Boolean).join(' · ')}</div>` : ''}
      </div>
      <div class="card">${meals}</div>
      ${entries.length ? `<button class="btn block" style="margin-top:12px" data-act="complete">${done ? '✓ Day complete (tap to undo)' : 'Mark day complete'}</button>` : ''}
      <div class="card">
        <h2>Vitamins & minerals</h2>
        ${(UI.showMicros ? micros : micros.slice(0, 6)).join('')}
        <button class="addline" data-act="micros">${UI.showMicros ? 'Show fewer' : `Show all ${MICROS.length}`}</button>
      </div>
      <div class="sync-pill" id="syncPill"></div>
    </div>`;
  }

  // ---------------------------------------------------------------- compare
  function renderCompare() {
    const k = UI.date, people = Object.values(S.profiles);
    const col = p => {
      const entries = p.diary[k] || [], t = totalsOf(entries), tg = targetsFor(p), g = p.garmin && p.garmin.days && p.garmin.days[k];
      const ws = Object.keys(p.weights || {}).sort().filter(x => x <= k), w = ws.length ? p.weights[ws[ws.length - 1]] : null;
      const row = (cls, label, v, target, unit) => `<div class="mrow"><div class="cmp-top"><span>${label}</span><span class="num">${fmt(v)}<span class="faint">/${fmt(target)}${unit}</span></span></div><div class="bar ${cls}"><i style="width:${target ? Math.min(100, v / target * 100) : 0}%"></i></div></div>`;
      return `<div class="card" style="--pc:${esc(p.color || '#1E7656')}">
        <div class="who-name"><span class="dot" style="width:9px;height:9px;border-radius:50%;background:${esc(p.color)}"></span>${esc(p.name)}</div>
        <div class="big">${fmt(t.kcal)}</div><div class="faint small">of ${fmt(tg.kcal)} kcal</div>
        <div class="cmp-bars">${row('pro', 'Protein', t.p, tg.p, 'g')}${row('carb', 'Carbs', t.c, tg.c, 'g')}${row('fat', 'Fat', t.f, tg.f, 'g')}${row('', 'Fibre', t.fib, 30, 'g')}</div>
        <div class="kv"><span>Weight</span><span>${w != null ? fmt(w, 1) : '–'}</span><span>Sleep</span><span>${g && g.sleepSec ? hm(g.sleepSec) : '–'}</span><span>Steps</span><span>${g && g.steps != null ? fmt(g.steps) : '–'}</span><span>Avg / peak HR</span><span>${g && (g.avgHr || g.maxHr) ? fmt(g.avgHr) + '/' + fmt(g.maxHr) : '–'}</span></div>
      </div>`;
    };
    const foods = p => {
      const entries = p.diary[k] || [];
      const body = MEALS.map(m => { const l = entries.filter(e => e.meal === m); return l.length ? `<div class="meal-title">${m} <span class="faint num">${fmt(totalsOf(l).kcal)} kcal</span></div><ul>${l.map(e => `<li><span>${esc(e.name)}</span><span class="faint num">${esc(entryAmount(e))}</span></li>`).join('')}</ul>` : ''; }).join('');
      return `<div class="card foodlist" style="border-top:4px solid ${esc(p.color)}"><h3>What ${esc(p.name)} ate</h3>${body || '<p class="muted">Nothing logged.</p>'}</div>`;
    };
    app.innerHTML = header() + `<div class="page"><div class="cmp">${people.map(col).join('')}</div>${people.map(foods).join('')}<div class="sync-pill" id="syncPill"></div></div>`;
  }

  // ---------------------------------------------------------------- weight
  function renderWeight() {
    const p = P(), k = todayKey(), ws = p.weights || {};
    const keys = Object.keys(ws).sort();
    const last = keys.length ? keys[keys.length - 1] : null;
    const recent = keys.filter(x => x >= addDays(k, -60));
    let chart = '';
    if (recent.length >= 2) {
      const W = 340, H = 150, pad = 26, vals = recent.map(x => ws[x]);
      const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
      const t0 = dateOf(recent[0]).getTime(), t1 = dateOf(recent[recent.length - 1]).getTime() || t0 + 1;
      const x = kk => pad + (W - pad - 8) * ((dateOf(kk).getTime() - t0) / Math.max(1, t1 - t0));
      const y = v => 8 + (H - 30) * (1 - (v - lo) / (hi - lo));
      chart = `<div class="chart"><svg viewBox="0 0 ${W} ${H}"><text x="2" y="${y(hi) + 4}" fill="var(--faint)" font-size="10">${hi}</text><text x="2" y="${y(lo) + 4}" fill="var(--faint)" font-size="10">${lo}</text>
        <path d="${recent.map((kk, i) => (i ? 'L' : 'M') + x(kk).toFixed(1) + ' ' + y(ws[kk]).toFixed(1)).join(' ')}" fill="none" stroke="var(--weight)" stroke-width="2.2"/>
        ${recent.map(kk => `<circle cx="${x(kk)}" cy="${y(ws[kk])}" r="3.4" fill="var(--weight)"/>`).join('')}
        <text x="${pad}" y="${H - 4}" fill="var(--faint)" font-size="10">${esc(shortDate(recent[0]))}</text><text x="${W - 8}" y="${H - 4}" fill="var(--faint)" font-size="10" text-anchor="end">${esc(shortDate(recent[recent.length - 1]))}</text></svg></div>`;
    }
    app.innerHTML = header(false) + `<div class="page">
      <div class="card">
        <h2>${esc(p.name)}'s weight today</h2>
        <div class="wbig"><input type="number" id="wIn" inputmode="decimal" step="0.1" min="25" max="300" value="${ws[k] ?? ''}" placeholder="${last ? fmt(ws[last], 1) : 'kg'}"><span class="muted" style="font-size:20px">kg</span></div>
        <button class="btn primary block" style="margin-top:12px" data-act="wsave">${ws[k] != null ? 'Update' : 'Save'}</button>
        <p class="faint small">${last ? `Last weigh-in ${fmt(ws[last], 1)} kg on ${esc(shortDate(last))}.` : 'Weigh in the morning, before eating, for steady readings.'}</p>
      </div>
      ${chart ? `<div class="card"><h2>Last 60 days</h2>${chart}</div>` : ''}
      <div class="card"><h2>Recent weigh-ins</h2>${keys.slice(-10).reverse().map(kk => `<div class="entry"><span class="n">${esc(longDate(kk))}</span><span class="k">${fmt(ws[kk], 1)} kg</span></div>`).join('') || '<p class="muted">None yet.</p>'}</div>
      <div class="sync-pill" id="syncPill"></div>
    </div>`;
  }

  // ---------------------------------------------------------------- more
  function renderMore() {
    app.innerHTML = header(false) + `<div class="page">
      <div class="card"><h2>Sync</h2><p class="muted small" style="margin-top:0">Signed in as ${esc(auth.email)}. Everything you log here appears in the PC app within a minute, and the other way round.</p>
        <button class="btn block" data-act="sync-now">Sync now</button><div class="sync-pill" id="syncPill"></div></div>
      <div class="card"><h2>Use it like an app</h2><p class="muted small" style="margin-top:0">In Safari, tap <b>Share</b> › <b>Add to Home Screen</b>. It then opens full screen from its own icon.</p></div>
      <div class="card"><h2>About</h2><p class="muted small" style="margin:0">Moatassim Health for iPhone v${APP_VERSION}. Food data: built-in list (USDA averages) and Open Food Facts. Targets, profiles and settings are changed in the PC app.</p></div>
      <button class="btn block danger" style="margin-top:14px" data-act="logout">Sign out of this phone</button>
    </div>`;
  }

  // ---------------------------------------------------------------- sheets
  const wrap = $('#sheetWrap'), sheet = $('#sheet');
  const sheetOpen = () => !wrap.hidden;
  function openSheet(html) { sheet.innerHTML = '<div class="grab"></div>' + html; wrap.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeSheet() { wrap.hidden = true; sheet.innerHTML = ''; document.body.style.overflow = ''; if (pendingRender) { pendingRender = false; render(); } }
  wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); });

  let A = null; // add-food state
  function snapshot(f) { return { id: f.id, name: f.name, n: { ...f.n }, unit: unitOf(f), size: f.size || null, portion: f.portion || null, portionLabel: f.portionLabel || null, source: f.source || 'Built-in', cat: f.cat || null, each: f.each || null }; }
  function search(q) {
    q = q.trim().toLowerCase(); if (!q) return [];
    const toks = q.split(/\s+/), rec = new Set((P().recent || []).map(r => r.id));
    return [...S.customFoods, ...BUILTIN].filter(f => toks.every(t => (f.name + ' ' + (f.cat || '')).toLowerCase().includes(t)))
      .map(f => [(f.name.toLowerCase().startsWith(q) ? 50 : 0) + (rec.has(f.id) ? 15 : 0) + (f.source !== 'Built-in' ? 5 : 0) - f.name.length / 20, f])
      .sort((a, b) => b[0] - a[0]).slice(0, 60).map(x => x[1]);
  }
  const resultBtn = f => `<button class="result" data-act="pick" data-id="${esc(f.id)}"><span class="n">${esc(f.name)}</span><span class="k">${fmt(f.n.kcal)} kcal</span><span class="s">per 100 ${unitOf(f)} · ${fmt(f.n.p, 1)}P ${fmt(f.n.c, 1)}C ${fmt(f.n.f, 1)}F${f.each ? ' · counted in ' + esc(f.each.many) : ''}${f.source !== 'Built-in' ? ' · ' + esc(f.source) : ''}</span></button>`;

  function openAdd(meal) {
    A = { meal, q: '', tab: (P().recent || []).length ? 'recent' : 'list', list: [], online: null, busy: false };
    renderAdd(true);
  }
  function renderAdd(first) {
    let results = '';
    if (A.tab === 'recent') { A.list = P().recent || []; results = A.list.map(resultBtn).join('') || '<p class="muted">Foods you log show up here.</p>'; }
    else if (A.tab === 'list') { A.list = search(A.q); results = A.q ? (A.list.map(resultBtn).join('') || `<p class="muted">Not in the food list. Try <b>Online</b>, or scan the barcode.</p>`) : '<p class="muted">Type to search the food list.</p>'; }
    else { A.list = A.online || []; results = A.busy ? '<p class="muted">Searching Open Food Facts…</p>' : A.online ? (A.online.map(resultBtn).join('') || '<p class="muted">Nothing found.</p>') : '<p class="muted">Type a product name and press Search.</p>'; }
    const html = `<div class="sheet-head"><h2 style="margin:0">Add to ${esc(A.meal.toLowerCase())} · ${esc(P().name)}</h2><button data-act="close">Close</button></div>
      <button class="btn primary block" data-act="scan">Scan a barcode</button>
      <div style="display:flex;gap:8px;margin-top:10px"><input type="search" id="aq" placeholder="Search foods" value="${esc(A.q)}" enterkeyhint="search" autocomplete="off">${A.tab === 'online' ? '<button class="btn" data-act="osearch">Search</button>' : ''}</div>
      <div class="seg">${[['recent', 'Recent'], ['list', 'Food list'], ['online', 'Online']].map(([k, l]) => `<button class="${A.tab === k ? 'on' : ''}" data-act="atab" data-t="${k}">${l}</button>`).join('')}</div>
      <div id="ares" style="margin-top:6px">${results}</div>`;
    if (first || !sheetOpen()) openSheet(html);
    else { const pos = $('#aq') && $('#aq').selectionStart; sheet.innerHTML = '<div class="grab"></div>' + html; const q = $('#aq'); if (q && pos != null && document.activeElement !== q) { q.focus(); q.setSelectionRange(pos, pos); } }
    const q = $('#aq');
    q.addEventListener('input', () => { A.q = q.value; if (A.tab === 'recent') A.tab = 'list'; if (A.tab !== 'online') { const r = $('#ares'); A.list = search(A.q); r.innerHTML = A.q ? (A.list.map(resultBtn).join('') || `<p class="muted">Not in the food list. Try <b>Online</b>, or scan the barcode.</p>`) : '<p class="muted">Type to search the food list.</p>'; document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.t === A.tab)); } });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (A.tab === 'online') onlineSearch(); else q.blur(); } });
  }
  async function onlineSearch() {
    if (!A.q.trim()) return;
    A.busy = true; renderAdd();
    try {
      const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(A.q)}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`);
      const j = await r.json();
      A.online = (j.products || []).map(offToFood).filter(Boolean);
    } catch (e) { A.online = []; toast('Could not reach Open Food Facts.'); }
    A.busy = false; if (A) renderAdd();
  }

  // amount sheet
  let M = null;
  function openAmount(food, meal, entry) {
    M = { food, meal, entry: entry || null, mode: entry ? (entry.count != null && entry.each ? 'count' : 'grams') : (food.each ? 'count' : 'grams'), count: entry ? (entry.count ?? 1) : 1, grams: entry ? entry.grams : food.each ? food.each.g : (food.portion || 100) };
    renderAmount(true);
  }
  function renderAmount(first) {
    const f = M.food, u = unitOf(f), counting = M.mode === 'count' && f.each;
    if (counting) M.grams = (Number(M.count) || 0) * f.each.g;
    const g = Number(M.grams) || 0, x = k => f.n[k] == null ? null : f.n[k] * g / 100;
    const chips = counting ? [0.5, 1, 2, 3, 4, 6].map(c => `<button class="chip ${Number(M.count) === c ? 'on' : ''}" data-act="cnt" data-v="${c}">${esc(countLabel(c, f.each))}</button>`)
      : [...(f.portion ? [[f.portion, (f.portionLabel || 'portion') + ' · ' + fmtAmt(f.portion, u)]] : []), ...(u === 'ml' ? [100, 200, 250, 330, 500] : [25, 50, 100, 150, 200]).map(v => [v, fmtAmt(v, u)])].map(([v, l]) => `<button class="chip ${Number(M.grams) === v ? 'on' : ''}" data-act="gr" data-v="${v}">${esc(l)}</button>`);
    const html = `<div class="sheet-head"><h2 style="margin:0;max-width:75%">${esc(f.name)}</h2><button data-act="close">Close</button></div>
      <div class="muted small">${fmt(f.n.kcal)} kcal per 100 ${u}${f.size ? ' · pack ' + esc(f.size) : ''} · ${esc(f.source === 'Built-in' ? 'Food list' : f.source || '')}</div>
      <div class="amount"><input type="number" id="amt" inputmode="decimal" step="${counting ? 0.5 : 1}" value="${counting ? M.count : g}"><span>${counting ? esc(Number(M.count) > 0 && Number(M.count) <= 1 ? f.each.one : f.each.many) : u}</span></div>
      ${counting ? `<div class="muted small" style="margin-bottom:8px">${fmtAmt(g, u)} · <a href="#" data-act="mode" data-m="grams">enter ${u === 'ml' ? 'ml' : 'grams'} instead</a></div>` : f.each ? `<div class="muted small" style="margin-bottom:8px"><a href="#" data-act="mode" data-m="count">count ${esc(f.each.many)} instead</a></div>` : ''}
      <div class="chips">${chips.join('')}</div>
      <div class="pmac"><div><b class="num">${fmt(x('kcal'))}</b><span>kcal</span></div><div><b class="num" style="color:var(--pro)">${fmt(x('p'), 1)}g</b><span>Protein</span></div><div><b class="num" style="color:var(--carb)">${fmt(x('c'), 1)}g</b><span>Carbs</span></div><div><b class="num" style="color:var(--fat)">${fmt(x('f'), 1)}g</b><span>Fat</span></div><div><b class="num">${fmt(x('fib'), 1)}g</b><span>Fibre</span></div><div><b class="num">${fmt(x('sug'), 1)}g</b><span>Sugars</span></div></div>
      <label class="f">Meal<select id="ameal">${MEALS.map(m => `<option ${m === M.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <button class="btn primary block" style="margin-top:14px" data-act="commit" ${g > 0 ? '' : 'disabled'}>${M.entry ? 'Save changes' : `Add ${counting ? esc(countLabel(Number(M.count) || 0, f.each)) : fmtAmt(g, u)} for ${esc(P().name)}`}</button>
      ${M.entry ? '<button class="btn block danger" style="margin-top:8px" data-act="remove">Remove</button>' : ''}`;
    if (first || !sheetOpen()) openSheet(html); else sheet.innerHTML = '<div class="grab"></div>' + html;
    const a = $('#amt');
    a.addEventListener('input', () => { if (counting) M.count = a.value; else M.grams = a.value; const pos = a.selectionStart; renderAmount(); const n = $('#amt'); n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} });
    $('#ameal').addEventListener('change', e => { M.meal = e.target.value; });
  }
  function commitAmount() {
    const f = M.food, counting = M.mode === 'count' && f.each;
    const count = counting ? Math.round(Number(M.count) * 4) / 4 : null;
    const g = counting ? Math.round(count * f.each.g * 10) / 10 : Math.round(Number(M.grams) * 10) / 10;
    if (!(g > 0)) return;
    const p = P(), list = p.diary[UI.date] || (p.diary[UI.date] = []);
    if (M.entry) { const en = list.find(x => x.id === M.entry.id); if (en) Object.assign(en, { grams: g, count, meal: M.meal, each: counting ? f.each : (en.each || null) }); }
    else {
      list.push({ id: uid(), foodId: f.id, name: f.name, grams: g, count, each: f.each || null, unit: unitOf(f), meal: M.meal, n: { ...f.n }, portion: f.portion || null, portionLabel: f.portionLabel || null, source: f.source || 'Built-in', at: Date.now() });
      if (f.source && f.source !== 'Built-in' && !S.customFoods.some(c => c.id === f.id)) S.customFoods.unshift({ ...snapshot(f), savedAt: Date.now() });
    }
    p.recent = [snapshot(f), ...(p.recent || []).filter(r => r.id !== f.id)].slice(0, 40);
    const msg = M.entry ? 'Entry updated.' : counting ? `Added ${countLabel(count, f.each)}${f.name.toLowerCase().includes(f.each.one) ? '' : ' (' + f.name + ')'}.` : `Added ${fmtAmt(g, unitOf(f))} of ${f.name}.`;
    M = null; A = null; closeSheet(); changed(); UI.tab = 'today'; render(); toast(msg);
  }

  // ---------------------------------------------------------------- barcode scanning
  const OFF_FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,quantity,product_quantity_unit,nutriments';
  const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const round = (v, d = 2) => v === null ? null : Math.round(v * 10 ** d) / 10 ** d;
  function offToFood(p) {
    const n = p.nutriments || {};
    const g = k => num(n[k + '_100g']);
    let kcal = g('energy-kcal');
    if (kcal === null && g('energy') !== null) kcal = g('energy') / 4.184;
    const x = (k, m) => { const v = g(k); return v === null ? null : round(v * m, 3); };
    let na = x('sodium', 1000);
    if (na === null && g('salt') !== null) na = round(g('salt') * 400, 1);
    const name = (p.product_name_en || p.product_name || '').trim();
    if (!name || kcal === null) return null;
    const brand = (p.brands || '').split(',')[0].trim();
    const liquid = String(p.product_quantity_unit || '').toLowerCase() === 'ml' || /\d\s*(ml|cl|l|litre|liter)s?\b/i.test(String(p.quantity || ''));
    return { id: 'off:' + p.code, source: 'Open Food Facts', name: brand ? `${name} (${brand})` : name, unit: liquid ? 'ml' : 'g', size: (p.quantity || '').trim() || null,
      portion: num(p.serving_quantity), portionLabel: p.serving_size || null,
      n: { kcal: round(kcal, 1), p: x('proteins', 1), c: x('carbohydrates', 1), f: x('fat', 1), fib: x('fiber', 1), sug: x('sugars', 1), sat: x('saturated-fat', 1), na,
        k: x('potassium', 1000), ca: x('calcium', 1000), fe: x('iron', 1000), mg: x('magnesium', 1000), zn: x('zinc', 1000), va: x('vitamin-a', 1e6), vc: x('vitamin-c', 1000),
        vd: x('vitamin-d', 1e6), ve: x('vitamin-e', 1000), vk: x('vitamin-k', 1e6), b6: x('vitamin-b6', 1000), b12: x('vitamin-b12', 1e6), fol: x('vitamin-b9', 1e6) ?? x('folates', 1e6),
        se: x('selenium', 1e6), io: x('iodine', 1e6), ph: x('phosphorus', 1000), cu: x('copper', 1000), b1: x('vitamin-b1', 1000), b2: x('vitamin-b2', 1000), b3: x('vitamin-pp', 1000), ch: x('choline', 1000),
        epa: (g('eicosapentaenoic-acid') === null && g('docosahexaenoic-acid') === null) ? null : round(((g('eicosapentaenoic-acid') || 0) + (g('docosahexaenoic-acid') || 0)) * 1000, 1),
        la: x('linoleic-acid', 1) ?? x('omega-6-fat', 1), ala: x('alpha-linolenic-acid', 1) } };
  }

  let scanner = null;
  async function startScan(meal) {
    closeSheet();
    if (!window.Html5Qrcode) { toast('The scanner is still loading. Try again in a second.'); return; }
    const box = document.createElement('div');
    box.className = 'scanner';
    box.innerHTML = `<div class="scan-top"><button data-sc="close">Cancel</button><span>Scan a barcode · ${esc(P().name)}</span><span style="width:60px"></span></div><div id="reader"></div><div class="scan-hint">Point the camera at the barcode on the pack.</div>`;
    document.body.appendChild(box);
    box.querySelector('[data-sc="close"]').onclick = stopScan;
    const F = window.Html5QrcodeSupportedFormats;
    scanner = new window.Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128], verbose: false });
    let handled = false;
    try {
      await scanner.start({ facingMode: 'environment' }, { fps: 12, qrbox: (w, h) => ({ width: Math.min(w * 0.85, 340), height: Math.min(h * 0.35, 180) }) },
        async (code) => { if (handled) return; handled = true; if (navigator.vibrate) navigator.vibrate(60); await stopScan(); lookupBarcode(code, meal); }, () => {});
    } catch (e) {
      await stopScan();
      toast('Camera not available. Allow camera access for this app in iPhone Settings.');
    }
  }
  async function stopScan() {
    try { if (scanner) { await scanner.stop(); scanner.clear(); } } catch (_) {}
    scanner = null;
    const el = document.querySelector('.scanner'); if (el) el.remove();
  }
  async function lookupBarcode(code, meal) {
    code = String(code).replace(/\D/g, '');
    const known = S.customFoods.find(f => f.id === 'off:' + code || f.id === 'bc:' + code);
    if (known) return openAmount(known, meal);
    openSheet(`<p class="muted">Looking up ${esc(code)}…</p>`);
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
      const j = await r.json();
      const f = j && j.status === 1 && j.product ? offToFood({ ...j.product, code }) : null;
      if (f) return openAmount(f, meal);
    } catch (e) { return notFound(code, meal, 'Could not reach Open Food Facts. Check your internet.'); }
    notFound(code, meal);
  }
  function notFound(code, meal, why) {
    openSheet(`<div class="sheet-head"><h2 style="margin:0">Product not found</h2><button data-act="close">Close</button></div>
      <p class="muted">${esc(why || `Barcode ${code} isn't in Open Food Facts yet. Add it from the label (per 100 g), and it's saved for next time on the phone and PC.`)}</p>
      <label class="f">Name<input type="text" id="nfName" placeholder="e.g. Tesco protein yogurt"></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">
        <label class="f">Calories (kcal)<input type="number" inputmode="decimal" id="nfK"></label>
        <label class="f">Protein (g)<input type="number" inputmode="decimal" id="nfP"></label>
        <label class="f">Carbs (g)<input type="number" inputmode="decimal" id="nfC"></label>
        <label class="f">Fat (g)<input type="number" inputmode="decimal" id="nfF"></label>
        <label class="f">Fibre (g)<input type="number" inputmode="decimal" id="nfFib"></label>
        <label class="f">Sugars (g)<input type="number" inputmode="decimal" id="nfS"></label>
      </div>
      <button class="btn primary block" style="margin-top:14px" data-act="nfsave" data-code="${esc(code)}" data-meal="${esc(meal)}">Save and log it</button>`);
  }
  function saveNotFound(code, meal) {
    const v = id => { const x = $(id).value; return x === '' ? null : Number(x); };
    const name = $('#nfName').value.trim();
    if (!name || v('#nfK') == null) { toast('Add at least a name and calories.'); return; }
    const n = {}; NKEYS.forEach(k => n[k] = null);
    Object.assign(n, { kcal: v('#nfK'), p: v('#nfP') ?? 0, c: v('#nfC') ?? 0, f: v('#nfF') ?? 0, fib: v('#nfFib'), sug: v('#nfS') });
    const food = { id: 'bc:' + code, name, cat: 'My foods', source: 'Mine', portion: null, portionLabel: null, n, savedAt: Date.now() };
    S.customFoods.unshift(food); changed();
    openAmount(food, meal);
  }

  // ---------------------------------------------------------------- actions
  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const act = a.dataset.act;
    if (act === 'login') return doLogin();
    if (act === 'who') { S.activeProfile = a.dataset.id; persist(); render(); return; }
    if (act === 'day') { UI.date = addDays(UI.date, Number(a.dataset.d)); if (UI.date > todayKey()) UI.date = todayKey(); render(); return; }
    if (act === 'today-jump') { UI.date = todayKey(); render(); return; }
    if (act === 'add') return openAdd(a.dataset.meal);
    if (act === 'micros') { UI.showMicros = !UI.showMicros; render(); return; }
    if (act === 'complete') { const p = P(); p.dayMeta = p.dayMeta || {}; const m = p.dayMeta[UI.date] || {}; m.complete = !m.complete; if (!m.complete) delete p.dayMeta[UI.date]; else p.dayMeta[UI.date] = m; changed(); render(); return; }
    if (act === 'edit') { const en = (P().diary[UI.date] || []).find(x => x.id === a.dataset.id); if (en) openAmount({ id: en.foodId, name: en.name, n: en.n, unit: en.unit, portion: en.portion, portionLabel: en.portionLabel, source: en.source, each: en.each || null }, en.meal, en); return; }
    if (act === 'close') { A = null; M = null; closeSheet(); return; }
    if (act === 'scan') return startScan(A ? A.meal : guessMeal());
    if (act === 'atab') { A.tab = a.dataset.t; renderAdd(); if (A.tab === 'online' && A.q.trim() && !A.online) onlineSearch(); return; }
    if (act === 'osearch') return onlineSearch();
    if (act === 'pick') { const f = A.list.find(x => x.id === a.dataset.id); if (f) openAmount(f, A.meal); return; }
    if (act === 'cnt') { M.count = Number(a.dataset.v); renderAmount(); return; }
    if (act === 'gr') { M.grams = Number(a.dataset.v); renderAmount(); return; }
    if (act === 'mode') { M.mode = a.dataset.m; if (M.mode === 'count') { M.count = Math.max(0.5, Math.round(Number(M.grams) / M.food.each.g * 2) / 2); } renderAmount(); return; }
    if (act === 'commit') return commitAmount();
    if (act === 'remove') { const list = P().diary[UI.date] || []; const i = list.findIndex(x => x.id === M.entry.id); if (i >= 0) { const [r] = list.splice(i, 1); const day = UI.date, p = P(); changed(); M = null; closeSheet(); render(); toast(`Removed ${r.name}.`, 'Undo', () => { (p.diary[day] = p.diary[day] || []).splice(i, 0, r); changed(); render(); }); } return; }
    if (act === 'nfsave') return saveNotFound(a.dataset.code, a.dataset.meal);
    if (act === 'wsave') { const v = Math.round(Number($('#wIn').value) * 10) / 10; if (!(v >= 25 && v <= 300)) { toast('Enter your weight in kg, e.g. 78.4'); return; } const p = P(); p.weights = p.weights || {}; p.weights[todayKey()] = v; changed(); render(); toast(`Saved ${fmt(v, 1)} kg for ${p.name}.`); return; }
    if (act === 'sync-now') { await sync(); render(); return; }
    if (act === 'logout') { if (!confirm('Sign out on this phone? Your data stays in Supabase and on the PC.')) return; LS.del('mh.auth'); LS.del('mh.meta'); LS.del('mh.state'); auth = null; engine = null; S = { profiles: {}, customFoods: [], activeProfile: null }; render(); return; }
  });

  // ---------------------------------------------------------------- toast
  let toastT;
  function toast(msg, label, fn) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${label ? `<button>${esc(label)}</button>` : ''}`;
    t.hidden = false;
    if (label) t.querySelector('button').onclick = () => { t.hidden = true; fn(); };
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4500);
  }

  window.MHApp = { lookupBarcode: (code) => lookupBarcode(code, guessMeal()) };
  // ---------------------------------------------------------------- start
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  engine = makeEngine();
  render();
  if (engine) sync();
  setInterval(() => { if (engine && document.visibilityState === 'visible') sync(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (UI.date < todayKey() && UI.tab === 'today' && !sheetOpen()) { /* keep chosen day */ } if (engine) sync(); } });
  window.addEventListener('online', () => { if (engine) sync(); });
})();
