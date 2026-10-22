// Moatassim Health - interface
(async function () {
  'use strict';
  const api = window.api;
  const social = window.social;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  const COLORS = () => {
    const cs = getComputedStyle(document.documentElement);
    return { pro: cs.getPropertyValue('--pro').trim(), carb: cs.getPropertyValue('--carb').trim(), fat: cs.getPropertyValue('--fat').trim(), leaf: cs.getPropertyValue('--leaf').trim(), ok: cs.getPropertyValue('--ok').trim(), low: cs.getPropertyValue('--low').trim(), muted: cs.getPropertyValue('--faint').trim(), ink: cs.getPropertyValue('--ink').trim() };
  };

  // ---------------------------------------------------------------- dates + numbers
  const pad2 = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const dateOf = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = dateOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const todayKey = () => keyOf(new Date());
  const longDate = k => dateOf(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = k => dateOf(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const dayName = k => dateOf(k).toLocaleDateString('en-GB', { weekday: 'short' });
  const rangeKeys = (end, n) => Array.from({ length: n }, (_, i) => addDays(end, i - n + 1));
  const fmt = (v, d = 0) => v == null || isNaN(v) ? '–' : Number(v).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtSmart = v => v == null ? '–' : (v >= 100 ? fmt(v) : v >= 10 ? fmt(v, 1).replace(/\.0$/, '') : fmt(v, 2).replace(/\.?0+$/, ''));
  const hm = sec => sec == null ? '–' : `${Math.floor(sec / 3600)}h ${pad2(Math.round(sec % 3600 / 60))}m`;
  const unitOf = f => (f && f.unit === 'ml') ? 'ml' : 'g';
  const fmtCount = n => { const w = Math.floor(n), h = Math.round((n - w) * 4); const fr = ['', '¼', '½', '¾'][h] ?? ''; return h === 4 ? String(w + 1) : (w ? String(w) : (fr ? '' : '0')) + fr; };
  const countLabel = (n, each) => `${fmtCount(n)} ${n > 0 && n <= 1 ? each.one : each.many}`;
  const entryAmount = e => e.count != null && e.each ? countLabel(e.count, e.each) : fmtAmt(e.grams, unitOf(e));
  const fmtAmt = (v, u) => u === 'ml' && v >= 1000 ? fmt(v / 1000, 2).replace(/\.?0+$/, '') + ' L' : fmt(v) + ' ' + u;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---------------------------------------------------------------- nutrients
  const MICRO_GROUPS = [
    { name: 'Limits', items: [
      { k: 'sug', name: 'Sugars', unit: 'g', limit: true },
      { k: 'sat', name: 'Saturated fat', unit: 'g', limit: true },
      { k: 'salt', name: 'Salt', unit: 'g', limit: true }
    ] },
    { name: 'Fibre & minerals', items: [
      { k: 'fib', name: 'Fibre', unit: 'g' },
      { k: 'k', name: 'Potassium', unit: 'mg' },
      { k: 'ca', name: 'Calcium', unit: 'mg' },
      { k: 'fe', name: 'Iron', unit: 'mg' },
      { k: 'mg', name: 'Magnesium', unit: 'mg' },
      { k: 'zn', name: 'Zinc', unit: 'mg' },
      { k: 'ph', name: 'Phosphorus', unit: 'mg' },
      { k: 'se', name: 'Selenium', unit: 'µg' },
      { k: 'io', name: 'Iodine', unit: 'µg' },
      { k: 'cu', name: 'Copper', unit: 'mg' }
    ] },
    { name: 'Vitamins', items: [
      { k: 'va', name: 'Vitamin A', unit: 'µg' },
      { k: 'vc', name: 'Vitamin C', unit: 'mg' },
      { k: 'vd', name: 'Vitamin D', unit: 'µg' },
      { k: 've', name: 'Vitamin E', unit: 'mg' },
      { k: 'vk', name: 'Vitamin K', unit: 'µg' },
      { k: 'b1', name: 'Vitamin B1 (thiamin)', unit: 'mg' },
      { k: 'b2', name: 'Vitamin B2 (riboflavin)', unit: 'mg' },
      { k: 'b3', name: 'Vitamin B3 (niacin)', unit: 'mg' },
      { k: 'b6', name: 'Vitamin B6', unit: 'mg' },
      { k: 'b12', name: 'Vitamin B12', unit: 'µg' },
      { k: 'fol', name: 'Folate', unit: 'µg' },
      { k: 'ch', name: 'Choline', unit: 'mg' }
    ] },
    { name: 'Essential fats', items: [
      { k: 'epa', name: 'Omega-3 EPA + DHA', unit: 'mg' },
      { k: 'ala', name: 'Omega-3 ALA', unit: 'g' },
      { k: 'la', name: 'Omega-6 (linoleic acid)', unit: 'g' }
    ] }
  ];
  const ALL_MICROS = MICRO_GROUPS.flatMap(g => g.items);
  const NKEYS = ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'na', 'k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 've', 'vk', 'b6', 'b12', 'fol', 'se', 'io', 'ph', 'cu', 'b1', 'b2', 'b3', 'ch', 'epa', 'la', 'ala'];
  const N_LABEL = { kcal: ['Calories', 'kcal'], p: ['Protein', 'g'], c: ['Carbs', 'g'], f: ['Fat', 'g'], fib: ['Fibre', 'g'], sug: ['Sugars', 'g'], sat: ['Saturated fat', 'g'], na: ['Sodium', 'mg'], k: ['Potassium', 'mg'], ca: ['Calcium', 'mg'], fe: ['Iron', 'mg'], mg: ['Magnesium', 'mg'], zn: ['Zinc', 'mg'], va: ['Vitamin A', 'µg'], vc: ['Vitamin C', 'mg'], vd: ['Vitamin D', 'µg'], ve: ['Vitamin E', 'mg'], vk: ['Vitamin K', 'µg'], b6: ['Vitamin B6', 'mg'], b12: ['Vitamin B12', 'µg'], fol: ['Folate', 'µg'], se: ['Selenium', 'µg'], io: ['Iodine', 'µg'], ph: ['Phosphorus', 'mg'], cu: ['Copper', 'mg'], b1: ['Vitamin B1', 'mg'], b2: ['Vitamin B2', 'mg'], b3: ['Vitamin B3', 'mg'], ch: ['Choline', 'mg'], epa: ['Omega-3 EPA + DHA', 'mg'], la: ['Omega-6', 'g'], ala: ['Omega-3 ALA', 'g'] };

  function microTargets() { return microTargetsFor(P()); }
  function microTargetsFor(person) {
    const male = person.profile.sex !== 'female';
    return {
      sug: 90, sat: male ? 30 : 20, salt: 6, fib: 30, k: 3500, ca: 1000, fe: male ? 8.7 : 14.8,
      mg: male ? 400 : 310, zn: male ? 11 : 8, va: male ? 900 : 700, vc: male ? 90 : 75, vd: 10, ve: 15,
      vk: male ? 120 : 90, b6: male ? 1.4 : 1.2, b12: 2.4, fol: 400,
      ph: 700, se: male ? 75 : 60, io: 150, cu: male ? 1.2 : 1.0,
      b1: male ? 1.2 : 1.1, b2: male ? 1.3 : 1.1, b3: male ? 16 : 14, ch: male ? 550 : 425,
      epa: 250, ala: male ? 1.6 : 1.1, la: male ? 17 : 12
    };
  }

  function autoTargets(p) {
    const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'female' ? -161 : 5);
    const adj = p.goal === 'lose' ? -500 : p.goal === 'lose-slow' ? -250 : p.goal === 'gain' ? 300 : 0;
    const kcal = Math.round((bmr * p.activity + adj) / 10) * 10;
    const pr = Math.round(p.proteinPerKg * p.weightKg);
    const f = Math.round(kcal * (p.fatPct / 100) / 9);
    const c = Math.max(0, Math.round((kcal - pr * 4 - f * 9) / 4));
    return { kcal, p: pr, c, f, bmr: Math.round(bmr) };
  }
  const targets = () => P().targets.auto ? autoTargets(P().profile) : P().targets;

  let _bbn = null;
  const builtinByName = () => _bbn || (_bbn = Object.fromEntries((window.BUILTIN_FOODS || []).map(f => [f.name, f])));
  function totalsOf(entries) {
    const t = { grams: 0, ml: 0, missing: {} };
    for (const k of NKEYS) t[k] = 0;
    for (const e of entries) {
      if (unitOf(e) === 'ml') t.ml += e.grams; else t.grams += e.grams;
      for (const k of NKEYS) {
        let v = e.n[k];
        // Entries logged before a nutrient was added: use the food list's value.
        if (v === undefined && (!e.source || e.source === 'Built-in')) { const bf = builtinByName()[e.name]; v = bf ? bf.n[k] : null; }
        if (v == null) { t.missing[k] = (t.missing[k] || 0) + 1; continue; }
        t[k] += v * e.grams / 100;
      }
    }
    t.salt = t.na * 2.5 / 1000;
    t.missing.salt = t.missing.na;
    return t;
  }
  const dayEntries = k => P().diary[k] || [];

  // ---------------------------------------------------------------- state
  const loaded = await api.load();
  let S = loaded.state;
  const P = () => S.profiles[S.activeProfile];
  const VERSION = loaded.version;
  const UI = { view: 'today', date: todayKey(), trendDays: 7, foodCat: 'All', foodQ: '', garminDays: 30 };
  const UI_DEFAULT_FORECAST = 6;
  UI.forecastMonths = UI_DEFAULT_FORECAST;
  const freshG = () => ({ checked: false, connected: !!P().garmin.displayName, installed: true, name: P().garmin.displayName, busy: false, err: '', needMfa: false, progress: null, lib: null, email: '', method: P().garmin.mode === 'signin' ? 'signin' : 'key' });
  let G = freshG();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; api.save(S, REV); }, 250);
  }

  // Phone sync: new data arrived from the phone (or Garmin) in the main process.
  let SYNC = loaded.sync || { enabled: false };
  let REV = loaded.rev || 0;
  let pendingRender = false;
  api.sync.onReload(msg => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; api.save(S, REV); return; } // our edit goes first; a merged copy follows
    const active = S.activeProfile;
    S = msg.state; REV = msg.rev;
    if (S.profiles[active]) S.activeProfile = active;
    if (modal.hidden) softRender(render); else pendingRender = true;
  });
  api.sync.onStatus(st => { SYNC = st; renderSideFoot(); if (UI.view === 'settings' && modal.hidden) renderSettings(); });

  function applyTheme() {
    const t = S.settings.theme;
    const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applyTheme(); render(); });
  applyTheme();

  // ---------------------------------------------------------------- foods index
  const BUILTIN = (window.BUILTIN_FOODS || []).map(f => ({ ...f, source: 'Built-in' }));
  const allFoods = () => [...S.customFoods, ...BUILTIN];
  function searchFoods(q, list = allFoods()) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const toks = q.split(/\s+/);
    const scored = [];
    for (const f of list) {
      const hay = (f.name + ' ' + (f.cat || '')).toLowerCase();
      if (!toks.every(t => hay.includes(t))) continue;
      const nm = f.name.toLowerCase();
      let s = 0;
      if (nm.startsWith(q)) s += 50;
      if (nm.split(/[\s,()/-]+/).some(w => w.startsWith(toks[0]))) s += 20;
      if (P().recent.some(r => r.id === f.id)) s += 15;
      if (f.source !== 'Built-in') s += 5;
      s -= nm.length / 20;
      scored.push([s, f]);
    }
    return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 80);
  }
  function snapshot(f) {
    return { id: f.id, name: f.name, n: { ...f.n }, unit: unitOf(f), size: f.size || null, portion: f.portion || null, portionLabel: f.portionLabel || null, source: f.source || 'Built-in', cat: f.cat || null, each: f.each || null };
  }
  function remember(f) {
    P().recent = [snapshot(f), ...P().recent.filter(r => r.id !== f.id)].slice(0, 40);
  }

  // ---------------------------------------------------------------- shell
  let main = $('#main');
  // Re-render without stealing focus: if you've already moved on to another box
  // (e.g. tapped the next field in Settings), wait until you leave the boxes.
  let softPending = null;
  const editingBox = el => el && main.contains(el) && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button'].includes(el.type)));
  function softRender(fn) {
    setTimeout(() => { if (editingBox(document.activeElement)) { softPending = fn; return; } softPending = null; fn(); }, 0);
  }
  document.addEventListener('focusout', () => setTimeout(() => {
    if (!softPending || editingBox(document.activeElement)) return;
    const fn = softPending; softPending = null; fn();
  }, 0));
  function nav(view) {
    UI.view = view;
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    main.scrollTop = 0;
    render();
  }
  $('#nav').addEventListener('click', e => { const b = e.target.closest('button[data-view]'); if (b) nav(b.dataset.view); });
  // Phone: bottom tab bar.
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]'); if (!b) return;
    const v = b.dataset.view;
    if (v === 'scan') return window.MHScanIntoLog();
    if (v === 'more') return openMore();
    nav(v);
  });
  function openMore() {
    card.className = 'modal-card narrow sheet-card';
    const items = [['garmin', 'Devices', 'Garmin and other watches'], ['foods', 'Food list', 'All foods, and your own'], ['forecast', 'Weight projection', 'Where your weight is heading'], ['settings', 'Settings', 'Account, goal, targets, notifications']];
    card.innerHTML = `<div class="modal-head"><h2>More</h2><button class="btn ghost" data-f="close">Close</button></div><div class="modal-body more-list">${items.map(([v, t, d]) => `<button data-f="go" data-v="${v}"><b>${t}</b><span>${d}</span></button>`).join('')}</div>`;
    modal.hidden = false;
    card.onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; closeModal(); if (b.dataset.f === 'go') nav(b.dataset.v); };
  }
  $('#sideAdd').addEventListener('click', () => openAdd({ meal: guessMeal(), date: UI.view === 'today' ? UI.date : todayKey() }));
  api.onNav(v => {
    let [view, pid] = String(v).split('@');
    if (pid && S.profiles[pid] && pid !== S.activeProfile) switchProfile(pid, true);
    if (view === 'add-food') { closeModal(); UI.date = todayKey(); nav('today'); openAdd({ meal: guessMeal(), date: todayKey() }); }
    else { if (view === 'today') UI.date = todayKey(); nav(view); }
  });

  document.title = 'Mabrouka Tracker';
  $('#brandVer').textContent = 'v' + VERSION;

  function switchProfile(pid, quiet) {
    if (!S.profiles[pid] || pid === S.activeProfile) return;
    S.activeProfile = pid;
    G = freshG();
    save();
    if (!quiet) { render(); toast(`Now logging for ${P().name}.`); }
  }

  const BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0"/></svg>';
  function renderMe() {
    const pts = myPoints();
    const html = `<button class="me-card" data-act2="go-settings"><span class="avatar" style="background:${esc(P().color)}">${esc((P().name || '?').charAt(0).toUpperCase())}</span><span class="pname">${esc(P().name)}<small>${pts == null ? 'Set a goal to rank' : fmt(pts, 1) + '% to goal'}</small></span></button>
      <button class="bell" data-act2="notes" aria-label="Notifications">${BELL}${NOTES.unread ? `<i>${NOTES.unread > 9 ? '9+' : NOTES.unread}</i>` : ''}</button>`;
    $('#profiles').innerHTML = html;
    const mt = $('#mtop'); if (mt) mt.innerHTML = `<div class="brand-mini"><img class="brand-mark" src="icons/icon-192.png" alt=""></div>` + html;
    document.documentElement.style.setProperty('--person', P().color);
  }
  function onChrome(e) {
    const b = e.target.closest('[data-act2]'); if (!b) return;
    if (b.dataset.act2 === 'go-settings') nav('settings');
    if (b.dataset.act2 === 'notes') openNotes();
  }
  $('#profiles').addEventListener('click', onChrome);
  if ($('#mtop')) $('#mtop').addEventListener('click', onChrome);

  function renderSideFoot() {
    $('#sideFoot').innerHTML = `<div title="${esc(SYNC.error || '')}"><span class="dot ${SYNC.error ? '' : 'on'}"></span>${SYNC.error ? esc(SYNC.error.length > 40 ? 'Not synced' : SYNC.error) : SYNC.lastSync ? 'Synced ' + new Date(SYNC.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Syncing…'}</div><div><span class="dot ${G.connected ? 'on' : ''}"></span>${G.connected ? 'Garmin connected' : 'No device connected'}</div>`;
  }

  function render() {
    renderMe();
    document.querySelectorAll('#tabbar button[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === UI.view || (b.dataset.view === 'more' && ['garmin', 'foods', 'forecast', 'settings'].includes(UI.view))));
    renderSideFoot();
    const v = UI.view;
    if (v === 'today') renderToday();
    else if (v === 'trends') renderTrends();
    else if (v === 'forecast') renderForecast();
    else if (v === 'garmin') renderGarmin();
    else if (v === 'foods') renderFoods();
    else if (v === 'settings') renderSettings();
    else if (v === 'friends') renderFriends();
  }

  function guessMeal() {
    const h = new Date().getHours();
    return h < 11 ? 'Breakfast' : h < 16 ? 'Lunch' : h < 21 ? 'Dinner' : 'Snacks';
  }

  // ---------------------------------------------------------------- toast
  let toastTimer;
  function toast(msg, actionLabel, action) {
    const el = $('#toast');
    el.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button>${esc(actionLabel)}</button>` : ''}`;
    el.hidden = false;
    if (actionLabel) el.querySelector('button').onclick = () => { el.hidden = true; action(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }

  function garminRenewBanner() {
    const g = P().garmin;
    if (!g.expiresAt) return '';
    const days = Math.ceil((new Date(g.expiresAt) - new Date()) / 864e5);
    if (days > 14) return '';
    return `<div class="nudge warn"><span><b>${days > 0 ? `Your Garmin key runs out in ${days} day${days === 1 ? '' : 's'}.` : 'Your Garmin key has expired.'}</b> Make a new Personal API key in Garmin Connect and add it on the Devices page.</span><button class="btn primary" data-action="g-renew">Add new key</button></div>`;
  }

  // ---------------------------------------------------------------- WEIGHT
  const weightKeys = () => Object.keys(P().weights).sort();
  function weightOn(k) { return P().weights[k] ?? null; }
  function latestWeight(upTo = todayKey()) {
    const ks = weightKeys().filter(x => x <= upTo);
    return ks.length ? { date: ks[ks.length - 1], kg: P().weights[ks[ks.length - 1]] } : null;
  }
  function currentWeight() { const l = latestWeight(); return l ? l.kg : P().profile.weightKg; }
  function weightCard(k) {
    const w = weightOn(k), prev = latestWeight(addDays(k, -1));
    const wk = latestWeight(addDays(k, -7));
    const ref = w ?? (latestWeight(k) || {}).kg;
    const ch = (ref != null && wk) ? ref - wk.kg : null;
    return `<div class="panel weight-card">
      <div class="wc-head"><h2>Weight</h2>${ch != null ? `<span class="muted small">${ch > 0 ? '+' : ''}${fmt(ch, 1)} kg vs a week before</span>` : ''}</div>
      <div class="wc-row">
        <div class="wc-in"><input type="number" id="wIn" min="25" max="300" step="0.1" value="${w ?? ''}" placeholder="${prev ? fmt(prev.kg, 1) : 'kg'}" aria-label="Weight in kg"><span>kg</span></div>
        <button class="btn primary" id="wSave">${w != null ? 'Update' : 'Save'}</button>
        ${w != null ? '<button class="btn ghost" id="wDel">Remove</button>' : ''}
      </div>
      <p class="muted small" style="margin:8px 0 0">${w != null ? `Saved for ${k === todayKey() ? 'today' : esc(shortDate(k))}.` : prev ? `Last weigh-in ${fmt(prev.kg, 1)} kg on ${esc(shortDate(prev.date))}.` : 'Weigh yourself in the morning, before eating, for the most even readings.'}
      <a href="#" data-action="go-forecast">See the projection</a></p>
    </div>`;
  }
  function wireWeight(k) {
    const inp = $('#wIn'); if (!inp) return;
    const saveW = () => {
      const v = Math.round(Number(inp.value) * 10) / 10;
      if (!(v >= 25 && v <= 300)) { toast('Enter your weight in kg, e.g. 78.4'); return; }
      P().weights[k] = v;
      if (k >= (latestWeight() || {}).date || k === todayKey()) P().profile.weightKg = v;
      save(); render(); toast(`Weight saved: ${fmt(v, 1)} kg.`);
    };
    $('#wSave').addEventListener('click', saveW);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveW(); });
    const del = $('#wDel');
    if (del) del.addEventListener('click', () => { const old = P().weights[k]; delete P().weights[k]; save(); render(); toast('Weight removed.', 'Undo', () => { P().weights[k] = old; save(); render(); }); });
  }

  // ---------------------------------------------------------------- TODAY
  function barHtml(cls, val, target) {
    const pct = target ? Math.min(100, val / target * 100) : 0;
    return `<div class="bar ${cls}"><i style="width:${pct}%"></i>${target && val > target * 1.02 ? '<span class="over"></span>' : ''}</div>`;
  }

  function microsHtml(t, divideBy = 1, count) {
    const tg = microTargets();
    let missingNote = '';
    const missingKeys = ALL_MICROS.filter(m => t.missing[m.k === 'salt' ? 'na' : m.k]);
    if (missingKeys.length && count) {
      const worst = Math.max(...missingKeys.map(m => t.missing[m.k === 'salt' ? 'na' : m.k]));
      missingNote = `<div class="note">${worst} of ${count} logged item${count === 1 ? '' : 's'} ${worst === 1 ? 'has' : 'have'} no data for some vitamins or minerals, so those totals may be a little low.</div>`;
    }
    return MICRO_GROUPS.map(g => `<div class="micro-group"><h3>${g.name}</h3><div class="micro-list">${g.items.map(m => {
      const v = t[m.k] / divideBy, target = tg[m.k], pct = target ? v / target * 100 : 0;
      const cls = m.limit ? `limit ${pct > 100 ? 'high' : ''}` : (pct < 70 ? 'low' : '');
      const label = m.limit ? `${fmtSmart(v)} / max ${fmtSmart(target)} ${m.unit}` : `${fmtSmart(v)} / ${fmtSmart(target)} ${m.unit}`;
      return `<div class="micro ${cls}"><span class="mn">${m.name}</span><span class="mv">${label} <span class="faint">${fmt(pct)}%</span></span><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div></div>`;
    }).join('')}</div></div>`).join('') + missingNote;
  }

  function renderToday() {
    const k = UI.date, isToday = k === todayKey();
    const entries = dayEntries(k);
    const t = totalsOf(entries), tg = targets();
    const kcalFromMacros = t.p * 4 + t.c * 4 + t.f * 9 || 1;
    const remaining = tg.kcal - t.kcal;
    const gd = P().garmin.days[k];
    const complete = P().dayMeta[k] && P().dayMeta[k].complete;
    const C = COLORS();

    const mealsHtml = MEALS.map(meal => {
      const list = entries.filter(e => e.meal === meal);
      const mt = totalsOf(list);
      return `<section class="meal">
        <div class="meal-head"><h3>${meal}</h3><span class="num">${list.length ? fmt(mt.kcal) + ' kcal' : ''}</span></div>
        <ul class="entries">${list.map(e => `<li class="entry" data-action="edit-entry" data-id="${e.id}" title="Click to change the amount or remove">
          <span class="ename">${esc(e.name)}</span>
          <span class="eg" title="${esc(fmtAmt(e.grams, unitOf(e)))}">${esc(entryAmount(e))}</span>
          <span class="ek">${fmt(e.n.kcal * e.grams / 100)}</span>
          <span class="emac"><span class="p">${fmt((e.n.p || 0) * e.grams / 100, 1)}P</span> · <span class="c">${fmt((e.n.c || 0) * e.grams / 100, 1)}C</span> · <span class="f">${fmt((e.n.f || 0) * e.grams / 100, 1)}F</span></span>
        </li>`).join('')}</ul>
        <button class="add-line" data-action="add" data-meal="${meal}">+ Add to ${meal.toLowerCase()}</button>
      </section>`;
    }).join('');

    main.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1>${isToday ? 'Today' : esc(longDate(k))}</h1><p class="sub">${isToday ? esc(longDate(k)) : (k > todayKey() ? 'Planned day' : 'Past day')}</p></div>
        <div class="datebar">
          <button class="btn icon" data-action="day" data-d="-1" aria-label="Previous day">‹</button>
          <input type="date" id="datePick" value="${k}" max="${addDays(todayKey(), 30)}">
          <button class="btn icon" data-action="day" data-d="1" aria-label="Next day">›</button>
          ${isToday ? '' : '<button class="btn" data-action="goto-today">Today</button>'}
        </div>
      </div>

      ${garminRenewBanner()}
      ${!P().setupDone ? `<div class="nudge"><span><b>Set up ${esc(P().name)}'s details</b> so the calorie targets and weight projection fit ${esc(P().name)}: age, height, weight and goal.</span><button class="btn primary" data-action="go-settings">Set up</button></div>` : ''}
      <div class="readout">
        <div class="scale ${t.kcal > tg.kcal * 1.05 ? 'over' : ''}">
          <div class="scale-label"><span>EATEN</span><span>TARGET ${fmt(tg.kcal)}</span></div>
          <div class="scale-value">${fmt(t.kcal)}<small>kcal</small></div>
          <div class="scale-foot"><span>${remaining >= 0 ? `<b>${fmt(remaining)}</b> left` : `<b>${fmt(-remaining)}</b> over`}</span><span><b>${fmt(t.grams)}</b> g food${t.ml ? ` · <b>${fmtAmt(t.ml, 'ml').replace(/ (ml|L)$/, '</b> $1')} drinks` : ''}</span></div>
        </div>
        <div>
          <div class="macro-rows">
            <div class="mrow"><span class="mname" style="color:${C.pro}">Protein</span>${barHtml('pro', t.p, tg.p)}<span class="mval">${fmt(t.p)} <span class="faint">/ ${fmt(tg.p)} g</span></span></div>
            <div class="mrow"><span class="mname" style="color:${C.carb}">Carbs</span>${barHtml('carb', t.c, tg.c)}<span class="mval">${fmt(t.c)} <span class="faint">/ ${fmt(tg.c)} g</span></span></div>
            <div class="mrow"><span class="mname" style="color:${C.fat}">Fat</span>${barHtml('fat', t.f, tg.f)}<span class="mval">${fmt(t.f)} <span class="faint">/ ${fmt(tg.f)} g</span></span></div>
          </div>
          ${entries.length ? `<div class="plate" title="Where your calories came from"><i style="width:${t.p * 4 / kcalFromMacros * 100}%;background:${C.pro}"></i><i style="width:${t.c * 4 / kcalFromMacros * 100}%;background:${C.carb}"></i><i style="width:${t.f * 9 / kcalFromMacros * 100}%;background:${C.fat}"></i></div>
          <div class="plate-key"><span>Calories from</span><span><i class="sw" style="background:${C.pro}"></i>protein ${fmt(t.p * 4 / kcalFromMacros * 100)}%</span><span><i class="sw" style="background:${C.carb}"></i>carbs ${fmt(t.c * 4 / kcalFromMacros * 100)}%</span><span><i class="sw" style="background:${C.fat}"></i>fat ${fmt(t.f * 9 / kcalFromMacros * 100)}%</span></div>` : ''}
          ${gd ? `<div class="garmin-strip"><span>Garmin</span>
            ${gd.kcalTotal != null ? `<span><b>${fmt(gd.kcalTotal)}</b>kcal burned</span>` : ''}
            ${gd.kcalTotal != null && entries.length ? `<span><b>${fmt(t.kcal - gd.kcalTotal)}</b>net</span>` : ''}
            ${gd.steps != null ? `<span><b>${fmt(gd.steps)}</b>steps</span>` : ''}
            ${gd.sleepScore != null ? `<span><b>${fmt(gd.sleepScore)}</b>sleep score</span>` : ''}
            ${gd.restingHr != null ? `<span><b>${fmt(gd.restingHr)}</b>resting bpm</span>` : ''}</div>` : ''}
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="panel">
          ${entries.length ? mealsHtml : `<div class="empty-day"><h2>Nothing logged for ${isToday ? 'today' : 'this day'} yet</h2><p>Add what you ate in grams and what you drank in ml. Search the food list, pick from Sainsbury's, Aldi or Co-op products, or look up anything online.</p><button class="btn primary" data-action="add" data-meal="${isToday ? guessMeal() : 'Breakfast'}">Log food</button></div>
            ${MEALS.map(m => `<button class="add-line" style="margin-right:16px" data-action="add" data-meal="${m}">+ ${m}</button>`).join('')}`}
          ${entries.length ? `<div class="day-actions">
            ${complete ? `<span class="complete-badge">Day marked complete</span><button class="btn ghost" data-action="toggle-complete">Undo</button>`
              : `<span class="muted small">Finished logging? Marking the day complete stops the reminder and counts it in Daily Performance.</span><button class="btn" data-action="toggle-complete">Mark day complete</button>`}
          </div>` : ''}
        </div>
        <div class="stack">
          ${weightCard(k)}
          <div class="panel">
            <h2>Vitamins & minerals</h2>
            ${entries.length ? microsHtml(t, 1, entries.length) : '<p class="muted">Your vitamins, minerals and fibre for the day show here once you log food.</p>'}
          </div>
        </div>
      </div>
    </div>`;
    wireWeight(k);

    $('#datePick').addEventListener('change', e => { if (e.target.value) { UI.date = e.target.value; render(); } });
  }

  main.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (!a) return;
    if (a.tagName === 'A') e.preventDefault();
    const act = a.dataset.action;
    if (act === 'day') { UI.date = addDays(UI.date, Number(a.dataset.d)); render(); }
    else if (act === 'goto-today') { UI.date = todayKey(); render(); }
    else if (act === 'go-settings') nav('settings');
    else if (act === 'g-renew') { G.connected = false; G.expired = true; G.checked = true; UI.device = 'garmin'; nav('garmin'); }
    else if (act === 'go-forecast') nav('forecast');
    else if (act === 'add') openAdd({ meal: a.dataset.meal, date: UI.date });
    else if (act === 'edit-entry') {
      const en = dayEntries(UI.date).find(x => x.id === a.dataset.id);
      if (en) openAdd({ date: UI.date, entry: en });
    }
    else if (act === 'toggle-complete') {
      const m = P().dayMeta[UI.date] || {};
      m.complete = !m.complete;
      P().dayMeta[UI.date] = m;
      save(); render();
      if (m.complete) toast('Day marked complete.');
    }
    else handleViewAction(act, a, e);
  });

  // ---------------------------------------------------------------- ADD FOOD MODAL
  const modal = $('#modal'), card = $('#modalCard');
  let M = null;
  function closeModal() {
    if (pendingRender) { pendingRender = false; setTimeout(render, 0); } modal.hidden = true; card.innerHTML = ''; card.className = 'modal-card'; card.style.width = ''; card.onclick = null; M = null; }
  card.addEventListener('click', e => onModalClick(e));
  modal.addEventListener('mousedown', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  function openAdd({ meal, date, entry, food }) {
    card.onclick = null;
    M = {
      date, meal: entry ? entry.meal : (meal || guessMeal()), q: '', tab: 'all', online: null, onlineBusy: false, onlineErr: [],
      sel: entry ? { id: entry.foodId, name: entry.name, n: entry.n, unit: unitOf(entry), portion: entry.portion, portionLabel: entry.portionLabel, source: entry.source, each: entry.each || null } : (food || null),
      mode: entry ? (entry.count != null && entry.each ? 'count' : 'grams') : (food && food.each ? 'count' : 'grams'),
      count: entry ? (entry.count ?? 1) : 1,
      shop: S.settings.lastShop || 'sainsburys', shopRes: null, shopBusy: false, shopErr: [], shopPage: 1, shopMore: false, shopKey: '',
      grams: entry ? entry.grams : food && food.each ? food.each.g : (food && food.portion) || 100, entry: entry || null
    };
    card.className = 'modal-card';
    card.innerHTML = `<div class="modal-head"><h2>${entry ? 'Change entry' : 'Log food'} · ${esc(date === todayKey() ? 'today' : longDate(date))}</h2><button class="btn ghost" data-m="close" aria-label="Close">Close</button></div>
      <div class="picker">
        <div class="picker-left">
          <div class="picker-search">
            <div class="search-row"><input type="text" id="mq" placeholder="Search foods, e.g. chicken breast, banana" autocomplete="off" spellcheck="false"><button class="btn scan-inline" data-m="scan" aria-label="Scan a barcode"><svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6"/></svg><span>Scan</span></button></div>
            <div class="seg" id="mtabs"><button data-tab="all" class="on">Food list</button><button data-tab="recent">Recent</button><button data-tab="shop">Shops</button><button data-tab="online">Search online</button></div>
            <button class="juice-btn" data-m="juice"><span class="jb-ico">🥤</span><span><b>Make a juice or smoothie</b><small>Add the liquid, fruit and extras you blended</small></span></button>
            <div class="shop-pick" id="mshops" hidden>${SHOP_LIST.map(([id, nm]) => `<button class="chip" data-shop="${id}">${esc(nm)}</button>`).join('')}</div>
          </div>
          <div class="results" id="mres"></div>
        </div>
        <div class="picker-right" id="mright"></div>
      </div>`;
    modal.hidden = false;
    const q = $('#mq');
    q.addEventListener('input', () => {
      M.q = q.value;
      if (M.tab === 'recent' && M.q) setTab('all');
      else if (M.tab === 'shop') { clearTimeout(M.shopTimer); const t = M.q.trim(); if (!t || t.length >= 3) M.shopTimer = setTimeout(() => runShop(1), 1200); }
      else if (M.tab !== 'online') renderResults();
    });
    $('#mshops').addEventListener('click', e => {
      const b = e.target.closest('button[data-shop]'); if (!b) return;
      M.shop = b.dataset.shop; S.settings.lastShop = M.shop; save(); runShop(1);
    });
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        if (M.tab === 'online') runOnline();
        else if (M.tab === 'shop') { clearTimeout(M.shopTimer); runShop(1); }
        else { const first = card.querySelector('.result'); if (first) first.click(); }
      }
      if (e.key === 'ArrowDown') { const first = card.querySelector('.result'); if (first) { e.preventDefault(); first.focus(); } }
    });
    $('#mtabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
    if (!entry && !food && P().recent.length) setTab('recent'); else renderResults();
    renderRight();
    if (entry || food) { const pk = card.querySelector('.picker'); if (pk) pk.classList.add('show-right'); }
    else if (!matchMedia('(max-width: 760px)').matches) setTimeout(() => q.focus(), 30);
  }

  const SHOP_LIST = [['sainsburys', "Sainsbury's"], ['aldi', 'Aldi'], ['coop', 'Co-op']];
  const shopName = id => (SHOP_LIST.find(x => x[0] === id) || [, id])[1];
  function setTab(tab) {
    M.tab = tab;
    card.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#mshops').hidden = tab !== 'shop';
    $('#mq').placeholder = tab === 'shop' ? `Search ${shopName(M.shop)} products, e.g. chicken, yogurt, cola` : 'Search foods, e.g. chicken breast, banana, Greek yogurt';
    if (tab === 'online' && M.q.trim() && !M.online) runOnline();
    else if (tab === 'shop' && M.shopKey !== M.shop + '|' + M.q.trim()) runShop(1);
    else renderResults();
    $('#mq').focus();
  }

  async function runShop(page) {
    const q = M.q.trim(), shop = M.shop, key = shop + '|' + q;
    M.tab = 'shop';
    card.querySelectorAll('#mshops button').forEach(b => b.classList.toggle('on', b.dataset.shop === shop));
    $('#mq').placeholder = `Search ${shopName(shop)} products, e.g. chicken, yogurt, cola`;
    M.shopBusy = true; M.shopKey = key;
    if (page === 1) { M.shopRes = null; M.shopErr = []; }
    renderResults();
    const r = await api.searchShop(shop, q, page);
    if (!M || M.shopKey !== key) return;
    M.shopBusy = false;
    const seen = new Set((M.shopRes || []).map(f => f.id));
    M.shopRes = [...(page === 1 ? [] : M.shopRes || []), ...r.results.filter(f => !seen.has(f.id))];
    M.shopErr = r.errors; M.shopPage = page; M.shopMore = r.more;
    renderResults();
  }

  function resultRow(f) {
    const n = f.n;
    const sel = M.sel && M.sel.id === f.id;
    const u = unitOf(f);
    const meta = f.source === 'Built-in' ? (f.cat || '') : f.source === 'Mine' ? 'My food' : f.source;
    return `<div class="result ${sel ? 'sel' : ''}" tabindex="0" data-m="pick" data-id="${esc(f.id)}">
      <span class="rn">${esc(f.name)}</span><span class="rk">${fmt(n.kcal)} kcal</span>
      <span class="rm">${esc(meta)}${f.size ? ' · pack ' + esc(f.size) : ''}${f.portionLabel && f.portion ? ' · ' + esc(f.portionLabel) + ' ≈ ' + fmtAmt(f.portion, u) : ''}</span>
      <span class="rm2">per 100 ${u} · ${fmt(n.p, 1)}P ${fmt(n.c, 1)}C ${fmt(n.f, 1)}F</span></div>`;
  }

  let lastList = [];
  function renderResults() {
    const box = $('#mres');
    if (!box) return;
    let html = '';
    if (M.tab === 'recent') {
      lastList = P().recent;
      html = P().recent.length ? `<div class="group-label">Recently logged</div>` + P().recent.map(resultRow).join('') : `<div class="hint">Foods you log appear here so you can add them again quickly.</div>`;
    } else if (M.tab === 'all') {
      if (!M.q.trim()) {
        lastList = [];
        html = `<div class="hint">Type to search ${BUILTIN.length + S.customFoods.length} foods. Food is per 100 g and drinks per 100 ml; you enter how much you had.<br><br>Want a supermarket product? Use <b>Shops</b> for Sainsbury's, Aldi and Co-op, or <b>Search online</b> for anything else.</div>`;
      } else {
        lastList = searchFoods(M.q);
        html = lastList.length ? lastList.map(resultRow).join('') : `<div class="hint">No match in the food list. <button class="btn" data-m="go-online">Search online for “${esc(M.q)}”</button></div>`;
      }
    } else if (M.tab === 'shop') {
      const nm = esc(shopName(M.shop));
      lastList = M.shopRes || [];
      if (M.shopBusy && !M.shopRes) html = `<div class="hint">Loading ${nm} products…</div>`;
      else {
        html = (M.shopErr.length ? `<div class="hint err">${M.shopErr.map(esc).join('<br>')}</div>` : '') +
          (lastList.length ? `<div class="group-label">${M.q.trim() ? `${nm} products matching “${esc(M.q.trim())}”` : `Popular ${nm} products · type to search`}</div>` + lastList.map(resultRow).join('')
            + (M.shopMore ? `<div class="hint"><button class="btn" data-m="shop-more" ${M.shopBusy ? 'disabled' : ''}>${M.shopBusy ? 'Loading…' : 'Show more'}</button></div>` : '')
            : (M.shopErr.length ? '' : `<div class="hint">No ${nm} products found${M.q.trim() ? ` for “${esc(M.q.trim())}”` : ''}. Try another word, or use <b>Search online</b>.</div>`));
        html += `<div class="hint faint small">Products come from Open Food Facts, where shoppers add products from these shops. It isn't the shops' own list, so some products are missing.</div>`;
      }
    } else {
      if (M.onlineBusy) html = `<div class="hint">Searching Open Food Facts and the USDA database…</div>`;
      else if (!M.q.trim()) html = `<div class="hint">Type a food or product name and press Enter. Results come from Open Food Facts (supermarket products, including UK brands) and the USDA food database.</div>`;
      else if (M.online) {
        lastList = M.online;
        html = (M.onlineErr.length ? `<div class="hint err">${M.onlineErr.map(esc).join('<br>')}</div>` : '') +
          (M.online.length ? M.online.map(resultRow).join('') : `<div class="hint">Nothing found online for “${esc(M.q)}”. Try fewer words, or create the food yourself from its label in Food list.</div>`);
      } else html = `<div class="hint"><button class="btn primary" data-m="online">Search online for “${esc(M.q)}”</button></div>`;
    }
    box.innerHTML = html;
  }

  async function runOnline() {
    const q = M.q.trim();
    if (!q) return;
    M.tab = 'online';
    card.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'online'));
    M.onlineBusy = true; M.online = null; renderResults();
    const r = await api.searchOnline(q, 'both');
    if (!M || M.q.trim() !== q) return;
    M.onlineBusy = false;
    // Food names that match the words first, products with fuller data next.
    const toks = q.toLowerCase().split(/\s+/);
    const filled = f => NKEYS.filter(k => f.n[k] != null).length;
    M.online = r.results.map(f => ({ ...f, _s: (toks.every(t => f.name.toLowerCase().includes(t)) ? 30 : 0) + filled(f) - f.name.length / 40 }))
      .sort((a, b) => b._s - a._s);
    M.onlineErr = r.errors;
    renderResults();
  }

  function renderRight(target) {
    const box = target || $('#mright');
    if (!box) return;
    const f = M.sel;
    if (!f) { box.innerHTML = `<div class="muted" style="padding-top:8px"><h2>Pick a food</h2><p>Choose a food or drink on the left, then type how much you had: grams for food, ml for drinks.</p></div>`; return; }
    const u = unitOf(f);
    const counting = M.mode === 'count' && f.each;
    if (counting) M.grams = (Number(M.count) || 0) * f.each.g;
    const g = Number(M.grams) || 0, n = f.n, x = k => n[k] == null ? null : n[k] * g / 100;
    const chips = [];
    if (f.portion) chips.push([f.portion, `${f.portionLabel || 'portion'} · ${fmtAmt(f.portion, u)}`]);
    for (const v of (u === 'ml' ? [100, 200, 250, 330, 500, 1000] : [25, 50, 100, 150, 200, 250])) if (!f.portion || Math.abs(v - f.portion) > 1) chips.push([v, fmtAmt(v, u)]);
    const micro = ['fib', 'sug', 'sat', 'salt', 'ca', 'fe', 'k', 'vc', 'vd', 'b12'].map(k => {
      const v = k === 'salt' ? (n.na == null ? null : n.na * 2.5 / 1000 * g / 100) : x(k);
      const lab = k === 'salt' ? ['Salt', 'g'] : N_LABEL[k];
      return `<span>${lab[0]}</span><span>${v == null ? '–' : fmtSmart(v) + ' ' + lab[1]}</span>`;
    }).join('');
    box.innerHTML = `<button class="btn ghost mobile-only back-btn" data-m="back">‹ Back to search</button><h2>${esc(f.name)}</h2>
      <div class="muted small">${esc(f.source === 'Built-in' ? 'Food list' : f.source === 'Mine' ? 'My food' : f.source)} · ${fmt(n.kcal)} kcal per 100 ${u}${f.size ? ' · pack ' + esc(f.size) : ''}</div>
      <div class="amount-q">How much did you have?</div>
      ${counting ? `<div class="grams-in"><input type="number" id="mg" min="0" step="0.5" value="${M.count}" aria-label="How many ${esc(f.each.many)}"><span>${esc(Number(M.count) > 0 && Number(M.count) <= 1 ? f.each.one : f.each.many)}</span></div>
      <div class="muted small" style="margin:-4px 0 10px">${fmtAmt(g, u)} · 1 ${esc(f.each.one)} ≈ ${fmtAmt(f.each.g, u)} · <a href="#" data-m="mode" data-mode="grams">enter ${u === 'ml' ? 'ml' : 'grams'} instead</a></div>
      <div class="chips">${[0.5, 1, 2, 3, 4, 6].map(c => `<button class="chip" data-m="count" data-c="${c}">${esc(countLabel(c, f.each))}</button>`).join('')}</div>`
      : `<div class="grams-in"><input type="number" id="mg" min="0" step="1" value="${g}" aria-label="${u === 'ml' ? 'Millilitres' : 'Grams'}"><span>${u}</span></div>
      ${u === 'ml' && g >= 1000 ? `<div class="muted small" style="margin:-4px 0 8px">= ${fmtAmt(g, 'ml')}</div>` : ''}
      ${f.each ? `<div class="muted small" style="margin:-4px 0 10px"><a href="#" data-m="mode" data-mode="count">count ${esc(f.each.many)} instead</a></div>` : ''}
      <div class="chips">${chips.map(([v, l]) => `<button class="chip" data-m="grams" data-g="${v}">${esc(l)}</button>`).join('')}</div>`}
      <div class="preview">
        <div class="pk num">${fmt(x('kcal'))}<small>kcal</small></div>
        <div class="pmac"><div class="p"><b>${fmt(x('p'), 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(x('c'), 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(x('f'), 1)} g</b><span>Fat</span></div></div>
        <div class="pmini">${micro}</div>
      </div>
      <label class="field" style="margin-top:16px"><span>Meal</span><select id="mmeal">${MEALS.map(m => `<option ${m === M.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button class="btn primary" data-m="commit" ${g > 0 ? '' : 'disabled'}>${M.entry ? 'Save changes' : `Add ${counting ? esc(countLabel(Number(M.count) || 0, f.each)) : fmtAmt(g, u)} to ${M.meal.toLowerCase()}`}</button>
        ${M.entry ? '<button class="btn danger" data-m="remove">Remove</button>' : ''}
      </div>`;
    if (!target) bindRight();
  }
  function bindRight() {
    const gi = $('#mg');
    if (gi && !gi._mhBound) {
      gi._mhBound = true;
      gi.addEventListener('input', () => { const f = M.sel; if (M.mode === 'count' && f && f.each) M.count = gi.value; else M.grams = gi.value; updatePreview(); });
      gi.addEventListener('keydown', e => { if (e.key === 'Enter' && Number(gi.value) > 0) commit(); });
    }
    const mm = $('#mmeal');
    if (mm && !mm._mhBound) { mm._mhBound = true; mm.addEventListener('change', e => { M.meal = e.target.value; updatePreview(); }); }
  }

  function updatePreview() {
    // Refresh the numbers on the right WITHOUT rebuilding the amount box, so the
    // box keeps focus (and the phone keyboard stays up) while you type.
    const box = $('#mright'); if (!box) return;
    const old = $('#mg');
    const tmp = document.createElement('div');
    renderRight(tmp);
    const oldKids = Array.from(box.children), newKids = Array.from(tmp.children);
    const same = old && tmp.querySelector('#mg') && oldKids.length === newKids.length && oldKids.every((o, i) => o.className === newKids[i].className && o.tagName === newKids[i].tagName);
    if (!same) {
      const hadFocus = old && document.activeElement === old;
      box.innerHTML = ''; newKids.forEach(n => box.appendChild(n)); bindRight();
      if (hadFocus) { const ng = $('#mg'); if (ng) ng.focus(); }
      return;
    }
    newKids.forEach((n, i) => {
      const o = oldKids[i];
      if (o.contains(old)) { const s = o.querySelector('span'), ns = n.querySelector('span'); if (s && ns && s.textContent !== ns.textContent) s.textContent = ns.textContent; }
      else if (!o.isEqualNode(n)) o.replaceWith(n);
    });
    bindRight();
  }

  function commit() {
    const f = M.sel;
    if (!f) return;
    const counting = M.mode === 'count' && f.each;
    const count = counting ? Math.round(Number(M.count) * 4) / 4 : null;
    const g = counting ? Math.round(count * f.each.g * 10) / 10 : Math.round(Number(M.grams) * 10) / 10;
    if (!(g > 0)) return;
    const list = P().diary[M.date] || (P().diary[M.date] = []);
    if (M.entry) {
      const en = list.find(x => x.id === M.entry.id);
      if (en) { en.grams = g; en.meal = M.meal; en.count = count; en.each = counting ? f.each : (en.each || null); }
    } else {
      list.push({ id: uid(), foodId: f.id, name: f.name, grams: g, count, each: f.each || null, unit: unitOf(f), meal: M.meal, n: { ...f.n }, portion: f.portion || null, portionLabel: f.portionLabel || null, source: f.source || 'Built-in', at: Date.now() });
      if (!['Built-in', 'Mine'].includes(f.source || 'Built-in') && !S.customFoods.some(c => c.id === f.id)) S.customFoods.unshift(snapshot(f));
    }
    remember(f);
    save();
    const date = M.date, meal = M.meal, editing = !!M.entry;
    closeModal();
    if (UI.view === 'today') { UI.date = date; render(); }
    toast(editing ? 'Entry updated.' : (counting ? `Added ${countLabel(count, f.each)}${f.name.toLowerCase().includes(f.each.one) ? '' : ' (' + f.name + ')'} to ${meal.toLowerCase()}.` : `Added ${fmtAmt(g, unitOf(f))} of ${f.name} to ${meal.toLowerCase()}.`));
  }

  async function scanIntoModal() {
    if (!window.MHScanner) return;
    const code = await window.MHScanner.scan();
    if (!code) return;
    const ctx = M ? { date: M.date, meal: M.meal } : { date: UI.view === 'today' ? UI.date : todayKey(), meal: guessMeal() };
    let food = S.customFoods.find(x => x.id === 'off:' + code || x.id === 'bc:' + code || x.barcode === code);
    if (!food) {
      toast('Looking up ' + code + '…');
      try { food = await social.lookupBarcode(code); } catch (e) { toast('Could not reach Open Food Facts. Check your internet, or add the product yourself.'); }
    }
    if (food) {
      if (!M) openAdd(ctx);
      M.sel = food; M.mode = food.each ? 'count' : 'grams'; M.count = 1; M.grams = food.each ? food.each.g : (food.portion ? Math.round(food.portion) : 100);
      renderRight();
      const pk = card.querySelector('.picker'); if (pk) pk.classList.add('show-right');
      const gi = $('#mg'); if (gi) { gi.focus(); gi.select(); }
      toast('Found: ' + food.name + '. Enter how much you had.');
      return;
    }
    closeModal();
    toast(`Barcode ${code} isn't in Open Food Facts yet. Add it from the label once and it's saved for next time.`);
    foodForm(null, { barcode: code, then: (f) => openAdd({ ...ctx, food: f }) });
  }
  window.MHScanIntoLog = () => { closeModal(); openAdd({ date: UI.view === 'today' ? UI.date : todayKey(), meal: guessMeal() }); scanIntoModal(); };

  // ---------------------------------------------------------------- juice / smoothie builder
  const JUICE_SETS = [
    ['Liquid', 'What did you blend it with?', ['Water', 'Milk, semi-skimmed', 'Milk, whole', 'Milk, skimmed', 'Almond milk, unsweetened', 'Oat milk', 'Soya milk, unsweetened', 'Coconut milk drink', 'Coconut water', 'Orange juice', 'Apple juice', 'Kefir, plain']],
    ['Fruit & veg', 'Fresh or frozen', ['Banana', 'Strawberries', 'Blueberries', 'Raspberries', 'Frozen mixed berries', 'Mango', 'Pineapple', 'Apple', 'Orange', 'Kiwi', 'Pear', 'Avocado', 'Dates, medjool', 'Spinach, raw', 'Kale, raw', 'Carrot, raw', 'Cucumber', 'Celery', 'Beetroot, cooked', 'Ginger, fresh', 'Lemon juice, fresh', 'Lime juice, fresh', 'Mint leaves, fresh']],
    ['Extras', 'Nuts, seeds, protein, sweeteners', ['Oats, rolled (dry)', 'Peanut butter', 'Almonds', 'Walnuts', 'Cashews', 'Chia seeds', 'Flaxseed, ground', 'Honey', 'Maple syrup', 'Whey protein powder (typical)', 'Greek yogurt, 0% fat', 'Skyr, plain', 'Cocoa powder, unsweetened', 'Cinnamon, ground', 'Ice cubes']]
  ];
  const foodByName = nm => BUILTIN.find(f => f.name === nm) || null;
  let J = null;
  function juiceDefault(f, setIdx) {
    if (setIdx === 0) return f.name === 'Water' || unitOf(f) === 'ml' ? 250 : 200;
    if (f.each) return f.each.g;
    return f.portion ? Math.round(f.portion) : (setIdx === 2 ? 20 : 80);
  }
  function openJuice(ctx) {
    M = null; // leave the normal log-food screen
    J = { date: ctx.date, meal: ctx.meal || guessMeal(), name: '', items: [], q: '', saveRecipe: true };
    card.className = 'modal-card narrow juice-card';
    card.onclick = juiceClick;
    modal.hidden = false;
    renderJuice();
  }
  function juiceTotals() {
    const tot = {}; let g = 0;
    for (const it of J.items) {
      const amt = Number(it.g) || 0; g += amt;
      for (const k of NKEYS) { const v = it.food.n[k]; if (v == null) continue; tot[k] = (tot[k] || 0) + v * amt / 100; }
    }
    return { tot, g };
  }
  function juiceName() {
    if (J.name.trim()) return J.name.trim();
    const fr = J.items.filter(i => !/^(Water|Milk|Almond milk|Oat milk|Soya milk|Coconut milk|Ice)/.test(i.food.name)).map(i => i.food.name.split(/[,(]/)[0].trim().toLowerCase());
    return fr.length ? 'Smoothie: ' + fr.slice(0, 3).join(', ') + (fr.length > 3 ? ' +' + (fr.length - 3) : '') : 'Juice';
  }
  function renderJuice(keepFocus) {
    const { tot, g } = juiceTotals();
    const have = new Set(J.items.map(i => i.food.id));
    const results = J.q.trim() ? searchFoods(J.q).slice(0, 8) : [];
    const rows = J.items.map((it, i) => {
      const u = unitOf(it.food);
      const each = it.food.each && Number(it.g) > 0 ? ` <span class="faint">≈ ${esc(countLabel(Math.round(Number(it.g) / it.food.each.g * 4) / 4, it.food.each))}</span>` : '';
      return `<div class="j-row"><span class="j-name">${esc(it.food.name)}${each}<small>${fmt((it.food.n.kcal || 0) * (Number(it.g) || 0) / 100)} kcal</small></span>
        <span class="j-amt"><input type="number" inputmode="decimal" min="0" step="1" value="${esc(it.g)}" data-ji="${i}" aria-label="Amount of ${esc(it.food.name)}"><span>${u}</span></span>
        <button class="btn ghost j-x" data-j="del" data-i="${i}" aria-label="Remove ${esc(it.food.name)}">✕</button></div>`;
    }).join('');
    card.innerHTML = `<div class="modal-head"><h2>Juice or smoothie</h2><button class="btn ghost" data-j="close">Close</button></div>
      <div class="modal-body">
        <p class="muted small" style="margin-top:0">Tap what went in, then set how much of each. Grams for solids, ml for liquids.</p>
        ${JUICE_SETS.map(([title, sub, names], si) => `<div class="j-set"><div class="j-set-h"><b>${title}</b> <span class="faint small">${sub}</span></div><div class="chips">${names.map(foodByName).filter(Boolean).map(f => `<button class="chip ${have.has(f.id) ? 'on' : ''}" data-j="add" data-id="${esc(f.id)}" data-s="${si}">${have.has(f.id) ? '✓ ' : '+ '}${esc(f.name.replace(/, (unsweetened|fresh|raw|plain|ground|medjool|rolled \(dry\)|cooked)$/, '').replace(' (typical)', ''))}</button>`).join('')}</div></div>`).join('')}
        <div class="j-set"><div class="j-set-h"><b>Something else?</b> <span class="faint small">Search your food list</span></div>
          <input type="text" id="jq" placeholder="e.g. peanut butter, mango, protein" value="${esc(J.q)}" autocomplete="off">
          ${results.length ? `<div class="chips" style="margin-top:8px">${results.map(f => `<button class="chip ${have.has(f.id) ? 'on' : ''}" data-j="add" data-id="${esc(f.id)}" data-s="1">${have.has(f.id) ? '✓ ' : '+ '}${esc(f.name)}</button>`).join('')}</div>` : J.q.trim() ? '<p class="faint small">No match in the food list.</p>' : ''}
        </div>
        <div class="j-list">${rows || '<p class="muted small">Nothing added yet.</p>'}</div>
        <div class="preview j-total">
          <div class="pk num">${fmt(tot.kcal || 0)}<small>kcal</small></div>
          <div class="pmac"><div class="p"><b>${fmt(tot.p || 0, 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(tot.c || 0, 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(tot.f || 0, 1)} g</b><span>Fat</span></div></div>
          <div class="muted small" style="margin-top:6px">${fmt(g)} ${J.items.some(i => unitOf(i.food) === 'ml') ? 'ml/g' : 'g'} in total · fibre ${fmt(tot.fib || 0, 1)} g · sugar ${fmt(tot.sug || 0, 1)} g${tot.vc != null ? ` · vitamin C ${fmt(tot.vc, 0)} mg` : ''}</div>
        </div>
        <label class="field" style="margin-top:14px"><span>Name</span><input type="text" id="jname" maxlength="60" placeholder="${esc(juiceName())}" value="${esc(J.name)}"></label>
        <label class="field" style="margin-top:10px"><span>Meal</span><select id="jmeal">${MEALS.map(m => `<option ${m === J.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="check" style="margin-top:12px"><input type="checkbox" id="jsave" ${J.saveRecipe ? 'checked' : ''}> Save it in My foods so I can log it again in one tap</label>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn primary" data-j="commit" ${J.items.length && g > 0 ? '' : 'disabled'}>Add to ${esc(J.meal.toLowerCase())}</button></div>
      </div>`;
    const jq = $('#jq');
    jq.addEventListener('input', () => {
      J.q = jq.value;
      const tmp = document.createElement('div'); const body = card.querySelector('.modal-body'); const top = body.scrollTop;
      // Swap only the suggestion chips so the search box keeps focus.
      const res = J.q.trim() ? searchFoods(J.q).slice(0, 8) : [];
      const hv = new Set(J.items.map(i => i.food.id));
      tmp.innerHTML = res.length ? `<div class="chips" style="margin-top:8px">${res.map(f => `<button class="chip ${hv.has(f.id) ? 'on' : ''}" data-j="add" data-id="${esc(f.id)}" data-s="1">${hv.has(f.id) ? '✓ ' : '+ '}${esc(f.name)}</button>`).join('')}</div>` : J.q.trim() ? '<p class="faint small">No match in the food list.</p>' : '';
      const set = jq.parentElement; while (set.lastElementChild && set.lastElementChild !== jq) set.lastElementChild.remove();
      while (tmp.firstChild) set.appendChild(tmp.firstChild);
      body.scrollTop = top;
    });
    card.querySelectorAll('[data-ji]').forEach(inp => inp.addEventListener('input', () => { J.items[Number(inp.dataset.ji)].g = inp.value; refreshJuiceTotals(); }));
    $('#jname').addEventListener('input', e => { J.name = e.target.value; });
    $('#jmeal').addEventListener('change', e => { J.meal = e.target.value; const b = card.querySelector('[data-j="commit"]'); if (b) b.textContent = 'Add to ' + J.meal.toLowerCase(); });
    $('#jsave').addEventListener('change', e => { J.saveRecipe = e.target.checked; });
    if (keepFocus) { const el = card.querySelector(keepFocus); if (el) { el.focus(); try { el.select(); } catch (_) {} } }
  }
  // Update the totals and per-item kcal without rebuilding the amount boxes.
  function refreshJuiceTotals() {
    const { tot, g } = juiceTotals();
    card.querySelectorAll('.j-row').forEach((row, i) => {
      const it = J.items[i]; if (!it) return;
      const sm = row.querySelector('.j-name small'); if (sm) sm.textContent = fmt((it.food.n.kcal || 0) * (Number(it.g) || 0) / 100) + ' kcal';
    });
    const box = card.querySelector('.j-total');
    if (box) box.innerHTML = `<div class="pk num">${fmt(tot.kcal || 0)}<small>kcal</small></div>
      <div class="pmac"><div class="p"><b>${fmt(tot.p || 0, 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(tot.c || 0, 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(tot.f || 0, 1)} g</b><span>Fat</span></div></div>
      <div class="muted small" style="margin-top:6px">${fmt(g)} ${J.items.some(i => unitOf(i.food) === 'ml') ? 'ml/g' : 'g'} in total · fibre ${fmt(tot.fib || 0, 1)} g · sugar ${fmt(tot.sug || 0, 1)} g${tot.vc != null ? ` · vitamin C ${fmt(tot.vc, 0)} mg` : ''}</div>`;
    const b = card.querySelector('[data-j="commit"]'); if (b) b.disabled = !(J.items.length && g > 0);
    const nm = $('#jname'); if (nm) nm.placeholder = juiceName();
  }
  function juiceClick(e) {
    const a = e.target.closest('[data-j]'); if (!a || !J) return;
    const act = a.dataset.j;
    if (act === 'close') { J = null; closeModal(); return; }
    if (act === 'add') {
      const f = allFoods().find(x => x.id === a.dataset.id); if (!f) return;
      const idx = J.items.findIndex(i => i.food.id === f.id);
      if (idx >= 0) { J.items.splice(idx, 1); renderJuice(); return; }
      J.items.push({ food: f, g: juiceDefault(f, Number(a.dataset.s)) });
      const body = card.querySelector('.modal-body'); const top = body ? body.scrollTop : 0;
      renderJuice();
      const nb = card.querySelector('.modal-body'); if (nb) nb.scrollTop = top;
      toast(`Added ${f.name}. Set the amount below.`);
      return;
    }
    if (act === 'del') { const body = card.querySelector('.modal-body'); const top = body.scrollTop; J.items.splice(Number(a.dataset.i), 1); renderJuice(); card.querySelector('.modal-body').scrollTop = top; return; }
    if (act === 'commit') {
      const { tot, g } = juiceTotals(); if (!(g > 0)) return;
      const n = {}; for (const k of NKEYS) n[k] = tot[k] == null ? null : Math.round(tot[k] / g * 100 * 1000) / 1000;
      const name = juiceName();
      const liquid = J.items.some(i => unitOf(i.food) === 'ml');
      const food = { id: 'mine-' + uid(), name, source: 'Mine', cat: 'Drinks', unit: liquid ? 'ml' : 'g', portion: Math.round(g), portionLabel: '1 serving (as made)', n,
        recipe: J.items.map(i => ({ id: i.food.id, name: i.food.name, g: Number(i.g) || 0 })), savedAt: Date.now() };
      if (J.saveRecipe) S.customFoods.unshift(food);
      const list = P().diary[J.date] || (P().diary[J.date] = []);
      list.push({ id: uid(), foodId: food.id, name, grams: Math.round(g), count: null, each: null, unit: food.unit, meal: J.meal, n: { ...n }, portion: food.portion, portionLabel: food.portionLabel, source: 'Mine', at: Date.now(), recipe: food.recipe });
      remember(food); save();
      const date = J.date, meal = J.meal; J = null; closeModal();
      if (UI.view === 'today') { UI.date = date; render(); }
      toast(`Added ${name} (${fmt(tot.kcal || 0)} kcal) to ${meal.toLowerCase()}.`);
    }
  }

  function onModalClick(e) {
    const a = e.target.closest('[data-m]');
    if (!a || !M) return;
    if (a.tagName === 'A') e.preventDefault();
    const m = a.dataset.m;
    if (m === 'close') closeModal();
    else if (m === 'pick') {
      const f = lastList.find(x => x.id === a.dataset.id);
      if (!f) return;
      M.sel = f;
      if (!M.entry) {
        if (f.each) { M.mode = 'count'; M.count = 1; M.grams = f.each.g; }
        else { M.mode = 'grams'; M.grams = f.portion ? Math.round(f.portion) : 100; }
      }
      card.querySelectorAll('.result').forEach(r => r.classList.toggle('sel', r === a));
      renderRight();
      const pk = card.querySelector('.picker'); if (pk) pk.classList.add('show-right');
      const gi = $('#mg'); if (gi) { gi.focus(); gi.select(); }
    }
    else if (m === 'back') { const pk = card.querySelector('.picker'); if (pk) pk.classList.remove('show-right'); }
    else if (m === 'scan') scanIntoModal();
    else if (m === 'juice') openJuice({ date: M.date, meal: M.meal });
    else if (m === 'grams') { M.grams = a.dataset.g; renderRight(); }
    else if (m === 'count') { M.count = Number(a.dataset.c); M.grams = M.count * M.sel.each.g; renderRight(); }
    else if (m === 'mode') {
      M.mode = a.dataset.mode;
      if (M.mode === 'count') { M.count = Math.max(0.5, Math.round(Number(M.grams) / M.sel.each.g * 2) / 2); M.grams = M.count * M.sel.each.g; }
      renderRight(); const gi = $('#mg'); if (gi) { gi.focus(); gi.select(); }
    }
    else if (m === 'commit') commit();
    else if (m === 'online' || m === 'go-online') runOnline();
    else if (m === 'shop-more') runShop(M.shopPage + 1);
    else if (m === 'remove') {
      const list = P().diary[M.date] || [];
      const idx = list.findIndex(x => x.id === M.entry.id);
      if (idx >= 0) {
        const [removed] = list.splice(idx, 1);
        const date = M.date;
        save(); closeModal(); render();
        toast(`Removed ${removed.name}.`, 'Undo', () => { (P().diary[date] = P().diary[date] || []).splice(idx, 0, removed); save(); render(); });
      }
    }
  }
  // Pick a result with the keyboard.
  card.addEventListener('keydown', e => {
    const r = e.target.closest && e.target.closest('.result');
    if (!r) return;
    if (e.key === 'Enter') r.click();
    if (e.key === 'ArrowDown' && r.nextElementSibling) { e.preventDefault(); r.nextElementSibling.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (r.previousElementSibling && r.previousElementSibling.classList.contains('result') ? r.previousElementSibling : $('#mq')).focus(); }
  });

  // ---------------------------------------------------------------- TRENDS
  function renderTrends() {
    const n = UI.trendDays, today = todayKey();
    const keys = rangeKeys(today, n);
    const counted = keys.filter(k => dayEntries(k).length && (k !== today || (P().dayMeta[k] && P().dayMeta[k].complete)));
    const tg = targets(), C = COLORS();
    const per = keys.map(k => totalsOf(dayEntries(k)));
    const sum = totalsOf(counted.flatMap(dayEntries));
    const dn = counted.length || 1;
    const avg = k => sum[k] / dn;
    const kcalMac = avg('p') * 4 + avg('c') * 4 + avg('f') * 9 || 1;
    const labels = keys.map(k => n <= 14 ? dayName(k) : shortDate(k));
    const tipLabels = keys.map(longDate);
    const burned = keys.map(k => P().garmin.days[k] && P().garmin.days[k].kcalTotal != null ? P().garmin.days[k].kcalTotal : null);
    const hasBurn = burned.some(v => v != null);
    const wts = keys.map(k => weightOn(k));
    const hasW = wts.some(v => v != null);
    const WCOL = getComputedStyle(document.documentElement).getPropertyValue('--weight').trim();
    // Garmin: sleep, average and peak heart rate per day.
    const gday = k => P().garmin.days[k] || null;
    const avgHrOf = d => d ? (d.avgHr ?? (d.hrCurve && d.hrCurve.length ? Math.round(d.hrCurve.reduce((a, p) => a + p[1], 0) / d.hrCurve.length) : null)) : null;
    const sleepH = keys.map(k => gday(k) && gday(k).sleepSec ? Math.round(gday(k).sleepSec / 360) / 10 : null);
    const avgHr = keys.map(k => avgHrOf(gday(k)));
    const peakHr = keys.map(k => gday(k) && gday(k).maxHr ? gday(k).maxHr : null);
    const hasG = [...sleepH, ...avgHr, ...peakHr].some(v => v != null);
    const mean = arr => { const v = arr.filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const SLEEP = '#5B7FD6', HRAVG = C.fat, HRPEAK = C.low;

    // Foods that gave the most calories
    const byFood = {};
    counted.forEach(k => dayEntries(k).forEach(e => {
      const r = byFood[e.name] || (byFood[e.name] = { kcal: 0, g: 0, times: 0, p: 0 });
      r.kcal += e.n.kcal * e.grams / 100; r.g += e.grams; r.times++; r.p += (e.n.p || 0) * e.grams / 100;
    }));
    const top = Object.entries(byFood).sort((a, b) => b[1].kcal - a[1].kcal).slice(0, 8);

    // Micronutrient table
    const mt = microTargets();
    const rows = ALL_MICROS.map(m => {
      const v = avg(m.k), pct = v / mt[m.k] * 100;
      let pill = '';
      if (m.limit) pill = pct > 100 ? '<span class="pill low">Above limit</span>' : '<span class="pill ok">Within limit</span>';
      else pill = pct < 70 ? '<span class="pill low">Low</span>' : pct < 100 ? '<span class="pill">Close</span>' : '<span class="pill ok">Met</span>';
      return `<tr><td>${m.name}</td><td class="n">${fmtSmart(v)} ${m.unit}</td><td class="n faint">${m.limit ? 'max ' : ''}${fmtSmart(mt[m.k])} ${m.unit}</td><td style="width:32%"><div class="bar ${!m.limit && pct < 70 ? '' : ''}" style="height:6px"><i style="width:${Math.min(100, pct)}%;background:${(m.limit ? pct > 100 : pct < 70) ? C.low : m.limit ? C.muted : C.ok}"></i></div></td><td class="n">${fmt(pct)}%</td><td>${pill}</td></tr>`;
    }).join('');

    main.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1>Daily Performance</h1><p class="sub">${counted.length ? `Daily average over ${counted.length} logged day${counted.length === 1 ? '' : 's'} in the last ${n} days. Today counts once you mark it complete.` : `No logged days in the last ${n} days yet.`}</p></div>
        <div class="seg" id="trendSeg">${[7, 14, 30, 90].map(d => `<button data-action="trend" data-n="${d}" class="${d === n ? 'on' : ''}">${d} days</button>`).join('')}</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="k">Calories</div><div class="v">${fmt(avg('kcal'))}<small>kcal</small></div><div class="d">Target ${fmt(tg.kcal)} · ${counted.length ? (avg('kcal') >= tg.kcal ? '+' : '') + fmt(avg('kcal') - tg.kcal) : '–'}</div></div>
        <div class="stat"><div class="k" style="color:${C.pro}">Protein</div><div class="v">${fmt(avg('p'))}<small>g</small></div><div class="d">${fmt(avg('p') * 4 / kcalMac * 100)}% of calories · target ${fmt(tg.p)} g</div></div>
        <div class="stat"><div class="k" style="color:${C.carb}">Carbs</div><div class="v">${fmt(avg('c'))}<small>g</small></div><div class="d">${fmt(avg('c') * 4 / kcalMac * 100)}% of calories · target ${fmt(tg.c)} g</div></div>
        <div class="stat"><div class="k" style="color:${C.fat}">Fat</div><div class="v">${fmt(avg('f'))}<small>g</small></div><div class="d">${fmt(avg('f') * 9 / kcalMac * 100)}% of calories · target ${fmt(tg.f)} g</div></div>
        <div class="stat"><div class="k">Fibre</div><div class="v">${fmt(avg('fib'))}<small>g</small></div><div class="d">Target ${fmt(mt.fib)} g</div></div>
      </div>
      <div class="stats" style="margin-top:12px">
        <div class="stat"><div class="k" style="color:${SLEEP}">Sleep</div><div class="v">${mean(sleepH) != null ? hm(mean(sleepH) * 3600) : '–'}</div><div class="d">average a night${mean(sleepH) == null ? ' · from Garmin' : ''}</div></div>
        <div class="stat"><div class="k" style="color:${HRAVG}">Average heart rate</div><div class="v">${fmt(mean(avgHr))}<small>bpm</small></div><div class="d">across the whole day</div></div>
        <div class="stat"><div class="k" style="color:${HRPEAK}">Peak heart rate</div><div class="v">${fmt(mean(peakHr))}<small>bpm</small></div><div class="d">average daily peak${peakHr.some(v => v != null) ? ' · highest ' + fmt(Math.max(...peakHr.filter(v => v != null))) : ''}</div></div>
        <div class="stat"><div class="k">Resting heart rate</div><div class="v">${fmt(mean(keys.map(k => gday(k) && gday(k).restingHr)))}<small>bpm</small></div><div class="d">average</div></div>
        ${metabolismTile()}
      </div>

      <div class="panel" style="margin-top:16px">
        <h2>Calories each day</h2>
        <div class="chart-key"><span><i class="sw" style="background:${C.pro}"></i>Protein</span><span><i class="sw" style="background:${C.carb}"></i>Carbs</span><span><i class="sw" style="background:${C.fat}"></i>Fat</span><span>– – Target ${fmt(tg.kcal)} kcal</span>${hasBurn ? `<span><i class="sw" style="background:${C.ink}"></i>Burned (Garmin)</span>` : ''}<span><i class="sw" style="background:${WCOL};border-radius:50%"></i>Weight, kg (right scale)${hasW ? '' : ' · add it on the Food diary page'}</span></div>
        ${barChart({ labels, tipLabels, height: 240, target: tg.kcal, unit: 'kcal',
          series: [{ label: 'Protein', color: C.pro, values: per.map(t => t.p * 4) }, { label: 'Carbs', color: C.carb, values: per.map(t => t.c * 4) }, { label: 'Fat', color: C.fat, values: per.map(t => t.f * 9) }],
          tipFmt: v => fmt(v) + ' kcal',
          line: hasBurn ? { label: 'Burned', color: C.ink, values: burned } : null,
          line2: hasW ? { label: 'Weight', color: WCOL, values: wts, unit: 'kg', fmt: v => fmt(v, 1) + ' kg' } : null, padRight: true })}
        <h3 style="margin:22px 0 8px">Sleep and heart rate</h3>
        ${hasG ? `<div class="chart-key"><span><i class="sw" style="background:${SLEEP}"></i>Sleep, hours</span><span><i class="sw" style="background:${HRAVG};border-radius:50%"></i>Average heart rate, bpm (right scale)</span><span><i class="sw" style="background:${HRPEAK};border-radius:50%"></i>Peak heart rate, bpm (right scale)</span></div>
        ${barChart({ labels, tipLabels, height: 200, padRight: true, yFmt: v => fmt(v, 1).replace(/\.0$/, '') + 'h', tipFmt: v => hm(v * 3600),
          series: [{ label: 'Sleep', color: SLEEP, values: sleepH.map(v => v || 0) }],
          line2: [{ label: 'Peak heart rate', color: HRPEAK, values: peakHr, unit: 'bpm', fmt: v => v + ' bpm', r: 3 }, { label: 'Average heart rate', color: HRAVG, values: avgHr, unit: 'bpm', fmt: v => v + ' bpm', r: 3 }] })}`
          : `<p class="muted">Connect ${esc(P().name)}'s Garmin on the Garmin tab to see sleep, average heart rate and peak heart rate for each day here.</p>`}
      </div>

      <div class="grid-2" style="margin-top:16px">
        <div class="panel">
          <h2>Vitamins & minerals, daily average</h2>
          ${counted.length ? `<table class="t"><thead><tr><th>Nutrient</th><th class="n">Average</th><th class="n">Target</th><th></th><th class="n">%</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted">Log a few days of food to see your averages.</p>'}
          ${counted.length && Object.keys(sum.missing).some(k => ALL_MICROS.some(m => m.k === k)) ? '<div class="note">Some foods you logged have no vitamin or mineral data (often online products), so a few averages may be a little low.</div>' : ''}
        </div>
        <div class="panel">
          <h2>Biggest calorie sources</h2>
          ${top.length ? `<table class="t"><thead><tr><th>Food</th><th class="n">kcal/day</th><th class="n">Times</th></tr></thead><tbody>${top.map(([name, r]) => `<tr><td>${esc(name)}</td><td class="n">${fmt(r.kcal / dn)}</td><td class="n">${r.times}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nothing logged in this period.</p>'}
        </div>
      </div>
    </div>`;
  }


  // ---------------------------------------------------------------- FRIENDS + RANKING
  const F = { list: null, loading: false, err: '', view: null, data: null, day: todayKey(), code: '', busy: false, msg: '' };
  const pointsText = v => v == null ? '–' : `${v > 0 ? '' : ''}${fmt(v, 1)}%`;
  const goalText = g => g === 'lose' ? 'Losing weight' : g === 'gain' ? 'Gaining weight' : 'Maintaining';
  async function loadFriends(force) {
    if (F.loading || (F.list && !force)) return;
    F.loading = true;
    try { F.list = await social.friends(); F.err = ''; }
    catch (e) { F.err = e.offline ? 'You\'re offline. Friends will load when you\'re back online.' : 'Could not load friends: ' + e.message; }
    F.loading = false;
    if (UI.view === 'friends' && modal.hidden) softRender(render);
    renderMe();
  }
  function myPoints() { return social.pointsFor(S); }
  function rankingRows() {
    const me = window.MH_ME || {};
    const rows = [{ id: 'me', name: P().name, color: P().color, goal: (P().profile.goal || '').startsWith('lose') ? 'lose' : P().profile.goal, points: myPoints(), me: true }];
    for (const f of (F.list || []).filter(x => x.status === 'accepted')) rows.push({ id: f.id, name: f.profile.name, color: f.profile.color, goal: f.profile.goal, points: f.profile.points, updated: f.profile.points_updated, friend: f });
    return rows.sort((a, b) => (b.points ?? -1e9) - (a.points ?? -1e9));
  }
  function renderFriends() {
    loadFriends();
    if (F.view) return renderFriendProfile();
    const code = (window.MH_ME && window.MH_ME.friend_code) || '…';
    const list = F.list || [];
    const incoming = list.filter(f => f.incoming), outgoing = list.filter(f => f.outgoing), friends = list.filter(f => f.status === 'accepted');
    const rows = rankingRows();
    const pr = P().profile;
    const needGoal = !pr.goalStart || (pr.goal !== 'maintain' && pr.goalWeightKg == null);
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Friends</h1><p class="sub">Your friend ID is <b class="code-pill" title="Tap to copy" data-action="copy-code">${esc(code)}</b>. Share it so friends can add you.</p></div></div>
      ${needGoal ? `<div class="nudge"><span><b>Set your goal to join the ranking.</b> Choose lose, gain or maintain and a goal weight in Settings. Your points start from your weight on that day.</span><button class="btn primary" data-action="go-settings">Set goal</button></div>` : ''}
      <div class="grid-2">
        <div class="panel">
          <h2>Ranking</h2>
          <p class="muted small" style="margin-top:-6px">Points are how far each person is from their start weight to their goal weight: 100% means goal reached. If you're maintaining, staying on your weight scores 100%.</p>
          ${rows.length > 1 || !F.loading ? `<ol class="rank">${rows.map((r, i) => `<li class="${r.me ? 'me' : ''}" ${r.friend ? `data-action="f-view" data-id="${esc(r.id)}"` : ''}>
            <span class="rk-pos num">${i + 1}</span><span class="avatar" style="background:${esc(r.color || '#E0263A')}">${esc((r.name || '?').charAt(0).toUpperCase())}</span>
            <span class="rk-name">${esc(r.name)}${r.me ? ' <span class="faint">(you)</span>' : ''}<small>${goalText(r.goal)}</small></span>
            <span class="rk-pts num">${pointsText(r.points)}</span>
            <span class="rk-bar"><i style="width:${r.points == null ? 0 : Math.max(0, Math.min(100, r.points))}%"></i></span></li>`).join('')}</ol>` : '<p class="muted">Loading…</p>'}
          ${!friends.length ? '<p class="muted small">Add a friend below to start competing.</p>' : ''}
        </div>
        <div class="stack">
          <div class="panel">
            <h2>Add a friend</h2>
            <div class="row-inline"><input type="text" id="fCode" placeholder="Their friend ID, e.g. MH-7K3Q9P" value="${esc(F.code)}" autocapitalize="characters" spellcheck="false"><button class="btn primary" data-action="f-add" ${F.busy ? 'disabled' : ''}>${F.busy ? 'Adding…' : 'Add'}</button></div>
            ${F.msg ? `<p class="small ${F.msgErr ? 'err' : 'muted'}">${esc(F.msg)}</p>` : ''}
          </div>
          ${incoming.length ? `<div class="panel"><h2>Friend requests</h2>${incoming.map(f => `<div class="frow"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)}</span><button class="btn primary" data-action="f-accept" data-id="${esc(f.id)}">Accept</button><button class="btn ghost" data-action="f-remove" data-id="${esc(f.id)}">Decline</button></div>`).join('')}</div>` : ''}
          ${outgoing.length ? `<div class="panel"><h2>Waiting for them to accept</h2>${outgoing.map(f => `<div class="frow"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)}</span><button class="btn ghost" data-action="f-remove" data-id="${esc(f.id)}">Cancel</button></div>`).join('')}</div>` : ''}
          ${friends.length ? `<div class="panel"><h2>What each friend can see</h2><p class="muted small" style="margin-top:-6px">Your ranking points are always visible to friends. Everything else is up to you, per friend.</p>
            ${friends.map(f => `<div class="share-row"><div class="frow" style="margin:0"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)}</span><button class="btn ghost" data-action="f-view" data-id="${esc(f.id)}">View</button></div>
              <label class="check"><input type="checkbox" data-share="see_diary" data-id="${esc(f.id)}" ${f.iShare.see_diary ? 'checked' : ''}> Can see what I eat each day</label>
              <label class="check"><input type="checkbox" data-share="see_weight" data-id="${esc(f.id)}" ${f.iShare.see_weight ? 'checked' : ''}> Can see my weight history</label>
              <label class="check"><input type="checkbox" data-share="notify_logs" data-id="${esc(f.id)}" ${f.iShare.notify_logs ? 'checked' : ''}> Gets a notification when I log food</label></div>`).join('')}</div>` : ''}
          ${F.err ? `<div class="panel flat"><span class="err">${esc(F.err)}</span></div>` : ''}
        </div>
      </div>
    </div>`;
    const fc = $('#fCode'); if (fc) { fc.addEventListener('input', () => { F.code = fc.value; }); fc.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-action="f-add"]').click(); }); }
    main.querySelectorAll('[data-share]').forEach(el => el.addEventListener('change', async () => {
      const f = F.list.find(x => x.id === el.dataset.id); if (!f) return;
      f.iShare = { ...f.iShare, [el.dataset.share]: el.checked };
      try { await social.setShare(f.id, f.iShare); toast(el.checked ? 'Shared.' : 'No longer shared.'); } catch (e) { toast('Could not save: ' + e.message); el.checked = !el.checked; }
    }));
  }

  async function loadFriendData(f, day) {
    F.data = { loading: true };
    renderFriendProfile();
    const out = { day, entries: [], weights: {}, garmin: null, dayMeta: null };
    try {
      const kinds = [];
      if (f.theyShare.see_diary) kinds.push('entry', 'daymeta', 'garmin');
      if (f.theyShare.see_weight) kinds.push('weight');
      if (kinds.length) {
        const rowsDay = f.theyShare.see_diary ? await social.friendItems(f.id, ['entry', 'daymeta', 'garmin'], day, day) : [];
        const rowsW = f.theyShare.see_weight ? await social.friendItems(f.id, ['weight'], addDays(todayKey(), -120), null) : [];
        for (const r of rowsDay) { if (r.kind === 'entry') out.entries.push(r.data); else if (r.kind === 'garmin') out.garmin = r.data; else if (r.kind === 'daymeta') out.dayMeta = r.data; }
        for (const r of rowsW) out.weights[r.day] = r.data.kg;
        out.entries.sort((a, b) => (a.at || 0) - (b.at || 0));
      }
    } catch (e) { out.error = e.offline ? 'You\'re offline.' : e.message; }
    F.data = out;
    if (UI.view === 'friends' && F.view === f.id) renderFriendProfile();
  }
  function renderFriendProfile() {
    const f = (F.list || []).find(x => x.id === F.view);
    if (!f) { F.view = null; return renderFriends(); }
    const d = F.data || {};
    if (!F.data || (F.data.day !== F.day && !F.data.loading)) { loadFriendData(f, F.day); return; }
    const C = COLORS(), WCOL = getComputedStyle(document.documentElement).getPropertyValue('--weight').trim();
    const t = totalsOf(d.entries || []);
    const wk = Object.keys(d.weights || {}).sort();
    const nothingShared = !f.theyShare.see_diary && !f.theyShare.see_weight;
    let wchart = '';
    if (wk.length >= 2) {
      const keys = rangeKeys(todayKey(), 90);
      wchart = lineChart({ labels: keys.map(shortDate), tipLabels: keys.map(longDate), series: [{ label: 'Weight', color: WCOL, values: keys.map(k => d.weights[k] ?? null), connect: true, dots: true }], height: 200, tipFmt: v => fmt(v, 1) + ' kg', yFmt: v => fmt(v, 0) });
    }
    const meals = MEALS.map(m => { const list = (d.entries || []).filter(e => e.meal === m); return list.length ? `<div class="cmp-meal"><b>${m}</b> <span class="faint num">${fmt(totalsOf(list).kcal)} kcal</span><ul>${list.map(e => `<li><span>${esc(e.name)}</span><span class="faint num">${esc(entryAmount(e))} · ${fmt(e.n.kcal * e.grams / 100)}</span></li>`).join('')}</ul></div>` : ''; }).join('');
    const g = d.garmin;
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><button class="btn ghost" data-action="f-back" style="margin:0 0 6px -10px">‹ Friends</button><h1 style="display:flex;align-items:center;gap:10px"><span class="avatar big" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span>${esc(f.profile.name)}</h1>
        <p class="sub">${goalText(f.profile.goal)} · ${pointsText(f.profile.points)} of the way to goal${f.profile.points_updated ? ' · updated ' + esc(new Date(f.profile.points_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : ''}</p></div>
        ${f.theyShare.see_diary ? `<div class="datebar"><button class="btn icon" data-action="f-day" data-d="-1" aria-label="Previous day">‹</button><span class="num" style="min-width:110px;text-align:center">${F.day === todayKey() ? 'Today' : esc(shortDate(F.day))}</span><button class="btn icon" data-action="f-day" data-d="1" ${F.day >= todayKey() ? 'disabled' : ''} aria-label="Next day">›</button></div>` : ''}
      </div>
      ${d.loading ? '<p class="muted">Loading…</p>' : d.error ? `<p class="err">${esc(d.error)}</p>` : nothingShared ? `<div class="panel"><p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their food or weight with you. You can still see their ranking points.</p></div>` : `
      <div class="grid-2">
        ${f.theyShare.see_diary ? `<div class="panel"><h2>What ${esc(f.profile.name)} ate</h2>
          <div class="cmp-kcal"><span class="num">${fmt(t.kcal)}</span><small>kcal${d.dayMeta && d.dayMeta.complete ? ' · day complete' : ''}</small></div>
          <div class="pmac" style="margin-bottom:12px"><div class="p"><b>${fmt(t.p)} g</b><span>Protein</span></div><div class="c"><b>${fmt(t.c)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(t.f)} g</b><span>Fat</span></div></div>
          ${meals || '<p class="muted">Nothing logged this day.</p>'}
          ${g ? `<div class="kv" style="margin-top:12px"><span>Sleep</span><span>${g.sleepSec ? hm(g.sleepSec) : '–'}</span><span>Steps</span><span>${g.steps != null ? fmt(g.steps) : '–'}</span><span>Avg / peak heart rate</span><span>${g.avgHr || g.maxHr ? fmt(g.avgHr) + ' / ' + fmt(g.maxHr) + ' bpm' : '–'}</span></div>` : ''}
        </div>` : `<div class="panel"><p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their food diary with you.</p></div>`}
        <div class="panel"><h2>Weight</h2>${f.theyShare.see_weight ? (wk.length ? `<div class="big-score"><span class="v">${fmt(d.weights[wk[wk.length - 1]], 1)}</span><span class="q">kg on ${esc(shortDate(wk[wk.length - 1]))}</span></div>${wchart}` : '<p class="muted">No weigh-ins yet.</p>') : `<p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their weight with you.</p>`}</div>
      </div>`}
      <div style="margin-top:20px"><button class="btn ghost danger" data-action="f-remove" data-id="${esc(f.id)}">Remove friend</button></div>
    </div>`;
  }

  // Notifications (bell)
  let NOTES = { list: [], unread: 0 };
  let seenNoteIds = null;
  async function loadNotes() {
    try {
      const l = await social.notifications();
      const fresh = seenNoteIds ? l.filter(n => !seenNoteIds.has(n.id) && !n.read) : [];
      seenNoteIds = new Set(l.map(n => n.id));
      NOTES = { list: l, unread: l.filter(n => !n.read).length }; renderMe();
      if (fresh.length) {
        // Something new arrived while the app is open: show it straight away.
        const n = fresh[0];
        toast(n.kind === 'food' ? n.title + ' · ' + n.body : (n.body || n.title), 'View', () => { if (/friend/.test(n.kind)) nav('friends'); else openNotes(); });
        if (fresh.some(x => /friend/.test(x.kind))) loadFriends(true);
      }
    } catch (_) {}
  }
  // A push arriving while the app is open: refresh at once.
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'mh-push') { loadNotes(); loadFriends(true); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { loadNotes(); if (UI.view === 'friends') loadFriends(true); } });
  function openNotes() {
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>Notifications</h2><button class="btn ghost" data-f="close">Close</button></div>
      <div class="modal-body">${NOTES.list.length ? NOTES.list.map(n => `<div class="note-row ${n.read ? '' : 'unread'}"><b>${esc(n.title)}</b><span>${esc(n.body)}</span><small class="faint">${esc(new Date(n.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small></div>`).join('') : '<p class="muted">Nothing yet. When friends log food (and allow it) or send you a friend request, it shows here.</p>'}</div>`;
    modal.hidden = false;
    card.onclick = e => { if (e.target.closest('[data-f="close"]')) closeModal(); };
    if (NOTES.unread) { social.markRead().catch(() => {}); NOTES.list.forEach(n => n.read = true); NOTES.unread = 0; renderMe(); }
  }

  // ---------------------------------------------------------------- FORECAST
  function bmrFor(w, pr) { return 10 * w + 6.25 * pr.heightCm - 5 * pr.age + (pr.sex === 'female' ? -161 : 5); }
  const KCAL_PER_KG = 7700;
  const fmtDate = k => dateOf(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Days that count: logged, and not today unless it's marked complete.
  function countedDays(keys) {
    const today = todayKey();
    return keys.filter(k => dayEntries(k).length && (k !== today || (P().dayMeta[k] && P().dayMeta[k].complete)));
  }
  function regression(pts) {
    const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    const den = pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) || 1;
    const slope = pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / den;
    return { slope, at0: my - slope * mx, meanY: my };
  }

  // Metabolism: what the body actually burns, worked out from food eaten and how
  // weight moved (eaten - kg change x 7,700 kcal), compared with what's expected
  // for this age, height, weight and activity (or Garmin's estimate).
  function metabolismModel() {
    const pr = P().profile, today = todayKey();
    const win = rangeKeys(today, 28);
    const days = countedDays(win);
    const pts = weightKeys().filter(k => k >= win[0] && k <= today).map(k => [(dateOf(k) - dateOf(today)) / 864e5, P().weights[k]]);
    const span = pts.length ? pts[pts.length - 1][0] - pts[0][0] : 0;
    const out = { ready: false, loggedDays: days.length, weighIns: pts.length, spanDays: Math.round(span), needDays: 10, needWeighIns: 4, needSpan: 14 };
    if (days.length < 10 || pts.length < 4 || span < 14) return out;
    const intake = days.reduce((a, k) => a + totalsOf(dayEntries(k)).kcal, 0) / days.length;
    const reg = regression(pts);
    const measured = intake - reg.slope * KCAL_PER_KG;
    const gd = win.filter(k => k !== today).map(k => P().garmin.days[k]).filter(d => d && d.kcalTotal);
    const expected = gd.length >= 7 ? gd.reduce((a, d) => a + d.kcalTotal, 0) / gd.length : bmrFor(reg.meanY, pr) * pr.activity;
    const pct = (measured / expected - 1) * 100;
    const label = pct <= -15 ? 'Slow' : pct <= -5 ? 'A little slow' : pct < 5 ? 'Normal' : pct < 15 ? 'A little fast' : 'Fast';
    const confidence = days.length >= 20 && pts.length >= 8 ? 'good' : days.length >= 14 && pts.length >= 6 ? 'fair' : 'early';
    return { ...out, ready: true, intake, measured, expected, expectedSource: gd.length >= 7 ? 'garmin' : 'estimate', pct, label, confidence, kgPerWeek: reg.slope * 7 };
  }

  // Day by day weight path for a daily intake. As weight changes, burn changes with it.
  function simulate(intake, burn0, w0, pr) {
    const b0 = bmrFor(w0, pr), out = [w0];
    let w = w0;
    for (let d = 1; d <= 365; d++) {
      w += (intake - burn0 * bmrFor(w, pr) / b0) / KCAL_PER_KG;
      w = Math.max(30, Math.min(300, w));
      out.push(w);
    }
    return out;
  }

  function forecastModel() {
    const pr = P().profile, today = todayKey();
    const win = rangeKeys(addDays(today, -1), 14);
    if (P().dayMeta[today] && P().dayMeta[today].complete) { win.shift(); win.push(today); }
    const days = win.filter(k => dayEntries(k).length);
    const lw = latestWeight();
    const w0 = lw ? lw.kg : pr.weightKg;
    const met = metabolismModel();
    const out = { w0, w0date: lw ? lw.date : null, loggedDays: days.length, met };
    // Burn: measured metabolism if there's enough data, else Garmin, else an estimate.
    const gd = win.map(k => P().garmin.days[k]).filter(d => d && d.kcalTotal);
    if (met.ready) { out.burn = met.measured; out.burnSource = 'measured'; }
    else if (gd.length >= 3) { out.burn = gd.reduce((a, d) => a + d.kcalTotal, 0) / gd.length; out.burnSource = 'garmin'; out.burnDays = gd.length; }
    else { out.burn = bmrFor(w0, pr) * pr.activity; out.burnSource = 'estimate'; }
    if (days.length >= 3) {
      out.intake = days.reduce((a, k) => a + totalsOf(dayEntries(k)).kcal, 0) / days.length;
      out.balance = out.intake - out.burn;
      out.cal = simulate(out.intake, out.burn, w0, pr);
    }
    const pts = weightKeys().filter(k => k >= addDays(today, -90) && k <= today).map(k => [(dateOf(k) - dateOf(today)) / 864e5, P().weights[k]]);
    if (pts.length >= 3 && pts[pts.length - 1][0] - pts[0][0] >= 10) {
      const r = regression(pts);
      out.trendSlope = r.slope;
      out.trend = Array.from({ length: 366 }, (_, d) => Math.max(30, r.at0 + r.slope * d));
      out.trendPoints = pts.length;
    }
    out.planKcal = Math.round(Number(pr.planKcal) || targets().kcal);
    out.plan = simulate(out.planKcal, out.burn, w0, pr);
    return out;
  }

  function goalDayOf(path, goal) {
    if (!goal || !path) return null;
    for (let d = 1; d <= 365; d++) if ((path[0] - goal) * (path[d] - goal) <= 0) return d;
    return null;
  }

  function renderForecast() {
    const months = UI.forecastMonths, H = Math.min(365, Math.round(months * 30.44));
    const m = forecastModel(), pr = P().profile, C = COLORS(), today = todayKey();
    const WCOL = getComputedStyle(document.documentElement).getPropertyValue('--weight').trim();
    const PLAN = '#2D7FB8';
    const name = esc(P().name), heShe = P().profile.sex === 'female' ? 'she' : 'he';
    const mLabel = months === 12 ? '1 year' : months + ' month' + (months === 1 ? '' : 's');
    const goal = pr.goalWeightKg;
    const same = m.cal || m.trend;

    // Shared x-axis: last weeks of weigh-ins + the projection.
    const PAST = Math.min(60, Math.max(14, months * 15));
    const keys = [...rangeKeys(addDays(today, -1), PAST), ...Array.from({ length: H + 1 }, (_, d) => addDays(today, d))];
    const fut = i => i - PAST;
    const logged = keys.map(k => k <= today ? weightOn(k) : null);
    const ahead = path => keys.map((k, i) => fut(i) >= 0 ? path[fut(i)] : null);
    const weighed = { label: 'Weighed', color: WCOL, values: logged, connect: true, dots: true, dash: '' };
    const chartOf = (series, height) => {
      const all = series.flatMap(x => x.values).filter(v => v != null).concat(goal ? [goal] : []);
      return lineChart({ labels: keys.map(shortDate), tipLabels: keys.map(longDate), series, height, yMin: Math.floor(Math.min(...all) - 1.5), yMax: Math.ceil(Math.max(...all) + 1.5), target: goal || null, markers: [{ i: PAST, label: 'Today' }], tipFmt: v => fmt(v, 1) + ' kg', yFmt: v => fmt(v, 0), labelEvery: Math.ceil(keys.length / 10) });
    };
    const statBlock = (path, how) => {
      const end = path[H], ch = end - m.w0, gd = goalDayOf(path, goal);
      return `<div class="stats">
        <div class="stat"><div class="k">In ${mLabel}</div><div class="v">${fmt(end, 1)}<small>kg</small></div><div class="d">${ch >= 0 ? '+' : ''}${fmt(ch, 1)} kg from ${fmt(m.w0, 1)} kg</div></div>
        <div class="stat"><div class="k">Per week</div><div class="v">${ch / (H / 7) >= 0 ? '+' : ''}${fmt(ch / (H / 7), 2)}<small>kg</small></div><div class="d">${how}</div></div>
        <div class="stat"><div class="k">${goal ? `Goal ${fmt(goal, 1)} kg` : 'Goal weight'}</div>${goal ? `<div class="v" style="font-size:22px;margin-top:10px">${gd ? esc(fmtDate(addDays(today, gd))) : 'Not within a year'}</div><div class="d">${gd ? 'about ' + (gd < 60 ? gd + ' days' : fmt(gd / 30.44, 1) + ' months') + ' away' : 'on this path'}</div>` : `<div class="d" style="margin-top:8px">Set one in Settings to see when ${name} would reach it.</div>`}</div>
      </div>`;
    };
    const burnText = m.burnSource === 'measured' ? `${name}'s measured burn (see Metabolism below)` : m.burnSource === 'garmin' ? `the Garmin daily total, averaged over ${m.burnDays} days` : `an estimate from age, height, weight and activity in Settings`;

    // 1) Same path
    let samePanel;
    if (!same) {
      samePanel = `<div class="panel"><h2>If ${name} carries on the same way</h2>
        <p class="muted">This needs at least 3 days of food logged in the last two weeks (${m.loggedDays} so far), or 3 weigh-ins spread over 10 days or more.</p>
        <button class="btn" data-action="go-today">Go to the food diary</button></div>`;
    } else {
      const series = [weighed];
      if (m.cal) series.push({ label: 'Same path (calories)', color: C.leaf, values: ahead(m.cal), dots: false, width: 2.6 });
      if (m.trend) series.push({ label: 'Weigh-in trend', color: C.muted, values: ahead(m.trend), dots: false, dash: '5 5' });
      const bal = m.balance;
      samePanel = `<div class="panel">
        <h2>If ${name} carries on the same way</h2>
        <p class="muted" style="margin-top:-4px">${m.cal ? (Math.abs(bal) < 50 ? `Eating about what ${heShe} burns: ${fmt(m.intake)} kcal a day over the last two weeks.` : `Eating about <b>${fmt(m.intake)} kcal</b> a day, which is <b>${fmt(Math.abs(bal))} kcal ${bal < 0 ? 'less' : 'more'}</b> than ${heShe} burns (${fmt(m.burn)}).`) : 'Following the weigh-ins only, because there isn\'t enough food logged.'}</p>
        ${statBlock(m.cal || m.trend, m.cal ? 'from calories' : 'from weigh-ins')}
        <div class="chart-key" style="margin-top:14px"><span><i class="sw" style="background:${WCOL};border-radius:50%"></i>Weigh-ins</span>${m.cal ? `<span><i class="sw" style="background:${C.leaf}"></i>Same path, from calories</span>` : ''}${m.trend ? `<span><i class="sw" style="background:${C.muted}"></i>Following the weigh-in trend</span>` : ''}${goal ? `<span>– – Goal ${fmt(goal, 1)} kg</span>` : ''}</div>
        ${chartOf(series, 260)}
      </div>`;
    }

    // 2) Set amount of calories
    const pk = m.planKcal, pBal = pk - m.burn;
    const chips = [...new Set([targets().kcal, Math.round((m.burn - 500) / 50) * 50, Math.round((m.burn - 250) / 50) * 50, Math.round(m.burn / 50) * 50, Math.round((m.burn + 300) / 50) * 50])].filter(v => v >= 1000);
    const pSeries = [weighed, { label: `${fmt(pk)} kcal a day`, color: PLAN, values: ahead(m.plan), dots: false, width: 2.6 }];
    if (m.cal) pSeries.push({ label: 'Same path', color: C.leaf, values: ahead(m.cal), dots: false, dash: '4 4', width: 1.6 });
    const planPanel = `<div class="panel" style="margin-top:16px">
        <h2>If ${name} eats a set amount each day</h2>
        <div class="plan-row">
          <label class="field"><span>Calories per day</span><div class="plan-in"><input type="number" id="planKcal" min="800" max="6000" step="50" value="${pk}"><span>kcal</span></div></label>
          <div class="chips">${chips.map(v => `<button class="chip ${v === pk ? 'on' : ''}" data-action="plan-kcal" data-v="${v}">${fmt(v)}${v === targets().kcal ? ' · target' : v === Math.round(m.burn / 50) * 50 ? ' · maintain' : ''}</button>`).join('')}</div>
        </div>
        <p class="muted">${Math.abs(pBal) < 50 ? `That's about what ${heShe} burns, so weight stays roughly the same.` : `That's <b>${fmt(Math.abs(pBal))} kcal ${pBal < 0 ? 'below' : 'above'}</b> what ${heShe} burns (${fmt(m.burn)} kcal a day).`}</p>
        ${statBlock(m.plan, `at ${fmt(pk)} kcal a day`)}
        <div class="chart-key" style="margin-top:14px"><span><i class="sw" style="background:${WCOL};border-radius:50%"></i>Weigh-ins</span><span><i class="sw" style="background:${PLAN}"></i>${fmt(pk)} kcal a day</span>${m.cal ? `<span><i class="sw" style="background:${C.leaf}"></i>Same path, for comparison</span>` : ''}${goal ? `<span>– – Goal ${fmt(goal, 1)} kg</span>` : ''}</div>
        ${chartOf(pSeries, 260)}
      </div>`;

    const ms = [1, 3, 6, 12].filter(x => x <= months);
    const rows = ms.map(x => { const d = Math.min(365, Math.round(x * 30.44)); return `<tr><td>${x === 12 ? '1 year' : x + ' month' + (x === 1 ? '' : 's')}</td><td class="muted">${esc(fmtDate(addDays(today, d)))}</td>
      ${same ? `<td class="n">${fmt((m.cal || m.trend)[d], 1)} kg</td>` : ''}<td class="n">${fmt(m.plan[d], 1)} kg</td></tr>`; }).join('');
    const met = m.met;

    main.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1>Weight projection</h1><p class="sub">${name} weighs ${fmt(m.w0, 1)} kg${m.w0date ? ' (weighed ' + esc(m.w0date === today ? 'today' : shortDate(m.w0date)) + ')' : ' (from Settings, no weigh-in yet)'}. Two ways the next ${mLabel} could go.</p></div>
        <div class="seg">${[1, 3, 6, 12].map(n => `<button data-action="fc-range" data-n="${n}" class="${n === months ? 'on' : ''}">${n === 12 ? '1 year' : n + ' month' + (n === 1 ? '' : 's')}</button>`).join('')}</div>
      </div>
      ${samePanel}
      ${planPanel}
      <div class="grid-2" style="margin-top:16px">
        <div class="panel">
          <h2>Milestones</h2>
          <table class="t"><thead><tr><th>In</th><th>Date</th>${same ? '<th class="n">Same path</th>' : ''}<th class="n">${fmt(pk)} kcal/day</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div class="panel">
          <h2>How it's worked out</h2>
          <div class="kv"><span>Burned per day</span><span>${fmt(m.burn)} kcal</span>${m.cal ? `<span>Eaten per day (last 2 weeks)</span><span>${fmt(m.intake)} kcal</span>` : ''}<span>Metabolism</span><span>${met.ready ? esc(met.label) : 'not worked out yet'}</span></div>
          <p class="muted small">Burned is ${burnText}. About 7,700 kcal is counted as 1 kg, and the burn drops a little as weight goes down (or rises as it goes up).</p>
          ${m.trend ? `<p class="muted small">The grey dashed line continues the straight-line trend of ${m.trendPoints} weigh-ins from the last 90 days (${m.trendSlope * 7 >= 0 ? '+' : ''}${fmt(m.trendSlope * 7, 2)} kg a week).</p>` : ''}
          <p class="faint small">Day-to-day weight jumps by 1–2 kg with water and food, so treat this as a direction, not a promise. Projections stop at one year.</p>
        </div>
      </div>
    </div>`;
    const pi = $('#planKcal');
    const setPlan = v => { v = Math.round(Number(v)); if (!(v >= 800 && v <= 6000)) return; P().profile.planKcal = v; save(); renderForecast(); const n = $('#planKcal'); if (n && document.activeElement !== n) { /* keep scroll */ } };
    pi.addEventListener('change', () => setPlan(pi.value));
    pi.addEventListener('keydown', e => { if (e.key === 'Enter') setPlan(pi.value); });
  }

  // Metabolism tile for Daily Performance.
  function metabolismTile() {
    const met = metabolismModel();
    if (!met.ready) {
      const need = [];
      if (met.loggedDays < met.needDays) need.push(`${met.needDays - met.loggedDays} more logged day${met.needDays - met.loggedDays === 1 ? '' : 's'}`);
      if (met.weighIns < met.needWeighIns) need.push(`${met.needWeighIns - met.weighIns} more weigh-in${met.needWeighIns - met.weighIns === 1 ? '' : 's'}`);
      if (met.spanDays < met.needSpan) need.push(`weigh-ins over ${met.needSpan}+ days`);
      return `<div class="stat" title="Works out how fast ${esc(P().name)} burns energy, from food logged and how weight moves."><div class="k">Metabolism</div><div class="v" style="font-size:22px;margin-top:8px">Learning…</div><div class="d">Needs ${esc(need.join(', '))} in the last 4 weeks.</div></div>`;
    }
    const col = met.pct <= -5 ? 'var(--low)' : met.pct >= 5 ? 'var(--pro)' : 'var(--leaf)';
    return `<div class="stat" title="From the last 4 weeks: eaten ${fmt(met.intake)} kcal/day on average while weight changed ${met.kgPerWeek >= 0 ? '+' : ''}${fmt(met.kgPerWeek, 2)} kg/week, so the body burned about ${fmt(met.measured)} kcal/day. Expected for ${esc(P().name)}: ${fmt(met.expected)} (${met.expectedSource === 'garmin' ? 'Garmin' : 'age, height, weight, activity'}). Confidence: ${met.confidence}.">
      <div class="k">Metabolism</div><div class="v" style="font-size:24px;margin-top:6px;color:${col}">${esc(met.label)}</div>
      <div class="d">Burns ~${fmt(met.measured)} kcal/day · ${met.pct >= 0 ? '+' : ''}${fmt(met.pct)}% vs expected${met.confidence === 'early' ? ' · early estimate' : ''}</div></div>`;
  }

  // ---------------------------------------------------------------- GARMIN
  async function garminCheck(force) {
    if (G.checked && !force) return;
    const g = G, pid = S.activeProfile;
    g.checked = true;
    const r = await api.garmin.status(pid);
    if (r.garmin) S.profiles[pid].garmin = r.garmin;
    if (r.code === 'not_installed') { g.installed = false; g.connected = false; }
    else if (r.ok) { g.connected = r.connected; g.expired = !!r.expired; g.name = r.displayName || S.profiles[pid].garmin.displayName; g.lib = r.lib; }
    else g.err = r.error || '';
    if (g !== G) return;
    if (UI.view === 'garmin') render(); else renderSideFoot();
  }

  async function garminSync(days, quiet) {
    if (G.busy) return;
    const pid = S.activeProfile, g = G;
    g.busy = true; g.err = ''; g.progress = { done: 0, total: days };
    if (UI.view === 'garmin') render();
    const r = await api.garmin.sync(pid, days);
    g.busy = false; g.progress = null;
    if (r.garmin) S.profiles[pid].garmin = r.garmin;
    if (!r.ok) {
      g.err = r.error || 'Sync failed.';
      if (r.code === 'not_connected' || r.code === 'expired') { g.connected = false; g.expired = r.code === 'expired'; }
      if (!quiet && pid === S.activeProfile) toast(g.err);
    } else if (!quiet && pid === S.activeProfile) toast(`Synced ${days} day${days === 1 ? '' : 's'} from Garmin.`);
    if (modal.hidden || UI.view !== 'today') render(); else renderSideFoot();
  }
  // Background sync for a profile that isn't on screen.
  async function quietSync(pid, days) {
    if (pid === S.activeProfile) { if (G.connected || P().garmin.displayName) { await garminCheck(true); if (G.connected) garminSync(days, true); } return; }
    const r = await api.garmin.sync(pid, days);
    if (r.garmin) S.profiles[pid].garmin = r.garmin;
  }
  api.garmin.onSetupProgress(m => {
    if (m) { G.setupBusy = true; G.setupMsg = m; const el = $('#gsetupmsg'); if (el) el.textContent = m; }
    else if (G.setupBusy || !G.installed) { G.setupBusy = false; G.checked = false; if (UI.view === 'garmin') { G.installed = true; render(); } }
  });
  api.garmin.onProgress(p => {
    if (p.pid && p.pid !== S.activeProfile) return;
    G.progress = p;
    const bar = $('#gprog');
    if (bar) bar.style.width = (p.done / p.total * 100) + '%';
    const lab = $('#gproglab');
    if (lab) lab.textContent = `Fetching day ${p.done} of ${p.total}…`;
  });

  function renderGarmin() {
    garminCheck();
    if (!G.connected) {
      const DEVICES = [
        { id: 'garmin', name: 'Garmin', what: 'Forerunner, Fenix, Venu, Vivoactive, Instinct, Epix, Edge and other Garmin Connect devices', ready: true },
        { id: 'oura', name: 'Oura Ring', what: 'Oura Ring Gen 3 and Oura Ring 4' },
        { id: 'polar', name: 'Polar', what: 'Polar watches and sensors (via Polar Flow)' },
        { id: 'withings', name: 'Withings', what: 'ScanWatch, smart scales and sleep analysers' },
        { id: 'whoop', name: 'WHOOP', what: 'WHOOP 4.0 and newer' },
        { id: 'fitbit', name: 'Fitbit / Pixel Watch', what: 'Fitbit trackers and Google Pixel Watch (via Google Health)' }
      ];
      const dev = UI.device || null;
      const yearOn = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return keyOf(d); })();
      let body;
      if (!dev) {
        body = `<h2>Which device do you use?</h2>
          <p class="muted" style="margin-top:-4px">Only devices that let apps read your data are listed.</p>
          <div class="dev-grid">${DEVICES.map(d => `<button class="dev ${d.ready ? '' : 'soon'}" data-action="dev-pick" data-id="${d.id}"><b>${esc(d.name)}</b><span>${esc(d.what)}</span>${d.ready ? '' : '<em>Coming soon</em>'}</button>`).join('')}</div>`;
      } else if (dev !== 'garmin') {
        const d = DEVICES.find(x => x.id === dev);
        body = `<h2>${esc(d.name)}</h2><p class="muted">${esc(d.name)} needs this app to be registered with them before it can connect. That's coming soon. Until then you can still log food and weight, and everything else works.</p>
          <button class="btn" data-action="dev-pick" data-id="">Choose a different device</button>`;
      } else {
        body = `<h2>Connect your Garmin with a Personal API key</h2>
          <ol class="steps-list">
            <li>Open <a href="https://connect.garmin.com/app/settings/personalApiToken" target="_blank">Garmin Connect › Settings › Personal API Key</a> (on a computer or in your phone's browser).</li>
            <li>Create a key (choose 1 year), and copy it. Garmin only shows it once.</li>
            <li>Paste it below with the date it expires, then tap Connect.</li>
          </ol>
          <div class="row">
            <label class="field"><span>Personal API key</span><input type="password" id="gkey" autocomplete="off" spellcheck="false" placeholder="Paste the key here"></label>
            <label class="field" style="max-width:220px"><span>Key expires on</span><input type="date" id="gkeyexp" value="${esc(G.keyExp || yearOn)}" min="${addDays(todayKey(), 1)}"></label>
          </div>
          <button class="btn primary" data-action="g-key" ${G.busy ? 'disabled' : ''}>${G.busy ? 'Checking the key…' : 'Connect Garmin'}</button>
          <p class="faint small" style="margin-top:12px">The key is kept on the app's server for your account only, and is only sent to Garmin. The app reminds you before it expires so you can make a new one.</p>
          <p class="small" style="margin-top:12px"><a href="#" data-action="dev-pick" data-id="">Choose a different device</a></p>`;
      }
      main.innerHTML = `<div class="page"><div class="page-head"><div><h1>Devices</h1><p class="sub">Bring sleep, heart rate, steps, stress and calories burned into the app.</p></div></div>
        <div class="panel connect" style="max-width:760px">
          ${G.expired ? `<div class="nudge warn" style="margin:0 0 14px"><span><b>Your Garmin key has expired.</b> Make a new one and add it below; your synced data is kept.</span></div>` : ''}
          ${body}
          ${G.err ? `<div class="err">${esc(G.err)}</div>` : ''}
        </div></div>`;
      const gk = $('#gkey'); if (gk) gk.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-action="g-key"]').click(); });
      return;
    }

    const k = UI.date, d = P().garmin.days[k] || null, C = COLORS();
    const keys30 = rangeKeys(todayKey(), UI.garminDays);
    const series = f => keys30.map(x => { const v = P().garmin.days[x] && P().garmin.days[x][f]; return v == null ? null : v; });
    const labels30 = keys30.map(x => UI.garminDays <= 14 ? dayName(x) : shortDate(x));
    const tips30 = keys30.map(longDate);
    const stTotal = d ? (d.deepSec || 0) + (d.lightSec || 0) + (d.remSec || 0) + (d.awakeSec || 0) : 0;
    const t = d && d.sleepStart ? new Date(d.sleepStart) : null, t2 = d && d.sleepEnd ? new Date(d.sleepEnd) : null;
    const clock = x => x ? `${pad2(x.getUTCHours())}:${pad2(x.getUTCMinutes())}` : '–';  // Garmin "Local" timestamps are local time stored as UTC
    const qual = q => q ? q.charAt(0) + q.slice(1).toLowerCase().replace(/_/g, ' ') : '';

    main.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1>Garmin</h1><p class="sub">${G.name ? esc(G.name) + ' · ' : ''}${P().garmin.lastSync ? 'last synced ' + new Date(P().garmin.lastSync).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'not synced yet'}${P().garmin.expiresAt ? ' · connection renews by ' + esc(new Date(P().garmin.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })) : ''}</p></div>
        <div class="datebar">
          <button class="btn icon" data-action="day" data-d="-1" aria-label="Previous day">‹</button>
          <input type="date" id="gdate" value="${k}" max="${todayKey()}">
          <button class="btn icon" data-action="day" data-d="1" aria-label="Next day" ${k >= todayKey() ? 'disabled' : ''}>›</button>
          <button class="btn primary" data-action="g-sync" data-n="3" ${G.busy ? 'disabled' : ''}>${G.busy ? 'Syncing…' : 'Sync now'}</button>
        </div>
      </div>
      ${garminRenewBanner()}
      ${G.busy ? `<div class="panel flat" style="margin-bottom:16px"><span id="gproglab" class="muted">Fetching from Garmin…</span><div class="progress"><i id="gprog" style="width:${G.progress ? G.progress.done / G.progress.total * 100 : 3}%"></i></div></div>` : ''}
      ${G.err ? `<div class="panel flat" style="margin-bottom:16px"><span class="err">${esc(G.err)}</span></div>` : ''}
      ${!d ? `<div class="panel"><h2>No Garmin data for ${esc(longDate(k))}</h2><p class="muted">Sync to bring in this day, or pick another date.</p><button class="btn" data-action="g-sync" data-n="30">Sync the last 30 days</button></div>` : `
      <div class="g-grid">
        <div class="panel g-card">
          <h2>Sleep</h2>
          <div class="big-score"><span class="v">${fmt(d.sleepScore)}</span><span class="q">${d.sleepScore != null ? 'sleep score' : 'no score'}${d.sleepQuality ? ' · ' + esc(qual(d.sleepQuality)) : ''}</span></div>
          ${stTotal ? `<div class="stages"><i class="st-deep" style="width:${d.deepSec / stTotal * 100}%"></i><i class="st-light" style="width:${d.lightSec / stTotal * 100}%"></i><i class="st-rem" style="width:${d.remSec / stTotal * 100}%"></i><i class="st-awake" style="width:${d.awakeSec / stTotal * 100}%"></i></div>` : ''}
          <div class="kv">
            <span>Time asleep</span><span>${hm(d.sleepSec)}</span>
            <span><i class="sw st-deep"></i>Deep</span><span>${hm(d.deepSec)}</span>
            <span><i class="sw st-light"></i>Light</span><span>${hm(d.lightSec)}</span>
            <span><i class="sw st-rem"></i>REM</span><span>${hm(d.remSec)}</span>
            <span><i class="sw st-awake"></i>Awake</span><span>${hm(d.awakeSec)}</span>
            <span>Bed / wake</span><span>${clock(t)} – ${clock(t2)}</span>
          </div>
        </div>
        <div class="panel g-card wide">
          <h2>Heart rate</h2>
          <div class="garmin-strip" style="margin:0 0 10px;padding:0;border:0">
            <span><b>${fmt(d.restingHr)}</b>resting bpm</span><span><b>${fmt(d.minHr)}</b>lowest</span><span><b>${fmt(d.maxHr)}</b>highest</span><span><b>${d.hrvNight != null ? fmt(d.hrvNight) : '–'}</b>ms overnight HRV${d.hrvStatus ? ' · ' + esc(qual(d.hrvStatus)) : ''}</span>
          </div>
          ${d.hrCurve && d.hrCurve.length ? lineChart({ labels: d.hrCurve.map(p => `${pad2(Math.floor(p[0] / 60))}:${pad2(p[0] % 60)}`), series: [{ label: 'bpm', color: C.fat, values: d.hrCurve.map(p => p[1]) }], height: 190, area: true, labelEvery: Math.ceil(d.hrCurve.length / 8), tipFmt: v => v + ' bpm' })
            : '<p class="muted">No heart-rate curve for this day.</p>'}
        </div>
        <div class="panel g-card">
          <h2>Activity</h2>
          <div class="big-score"><span class="v">${fmt(d.steps)}</span><span class="q">steps${d.stepGoal ? ' / ' + fmt(d.stepGoal) : ''}</span></div>
          ${d.stepGoal ? `<div class="bar" style="margin:12px 0"><i style="width:${Math.min(100, (d.steps || 0) / d.stepGoal * 100)}%"></i></div>` : ''}
          <div class="kv">
            <span>Distance</span><span>${d.distanceKm != null ? fmt(d.distanceKm, 1) + ' km' : '–'}</span>
            <span>Intensity minutes</span><span>${fmt(d.intensityMin)}</span>
            <span>Floors climbed</span><span>${fmt(d.floors)}</span>
          </div>
        </div>
        <div class="panel g-card">
          <h2>Calories burned</h2>
          <div class="big-score"><span class="v">${fmt(d.kcalTotal)}</span><span class="q">kcal total</span></div>
          <div class="kv" style="margin-top:12px">
            <span>Active</span><span>${fmt(d.kcalActive)} kcal</span>
            <span>Resting (BMR)</span><span>${fmt(d.kcalBmr)} kcal</span>
            <span>Eaten (diary)</span><span>${dayEntries(k).length ? fmt(totalsOf(dayEntries(k)).kcal) + ' kcal' : '–'}</span>
          </div>
        </div>
        <div class="panel g-card">
          <h2>Body Battery & stress</h2>
          <div class="big-score"><span class="v">${fmt(d.bbNow ?? d.bbHigh)}</span><span class="q">${d.bbNow != null ? 'Body Battery now' : 'Body Battery high'}</span></div>
          <div class="kv" style="margin-top:12px">
            <span>Highest / lowest</span><span>${fmt(d.bbHigh)} / ${fmt(d.bbLow)}</span>
            <span>Charged / drained</span><span>+${fmt(d.bbCharged)} / −${fmt(d.bbDrained)}</span>
            <span>Average stress</span><span>${fmt(d.stressAvg)}</span>
            <span>Avg SpO₂</span><span>${d.spo2Avg != null ? fmt(d.spo2Avg) + '%' : '–'}</span>
          </div>
        </div>
      </div>`}

      <div class="page-head" style="margin-top:28px;margin-bottom:12px"><h2 style="margin:0">Trends</h2>
        <div class="seg">${[14, 30, 90].map(n => `<button data-action="g-range" data-n="${n}" class="${n === UI.garminDays ? 'on' : ''}">${n} days</button>`).join('')}</div></div>
      <div class="g-grid">
        <div class="panel g-card wide" style="grid-column:span 6"><h2>Sleep score</h2>${lineChart({ labels: labels30, tipLabels: tips30, series: [{ color: '#6C93E0', values: series('sleepScore') }], height: 180, yMin: 0, yMax: 100 })}</div>
        <div class="panel g-card wide" style="grid-column:span 6"><h2>Resting heart rate</h2>${lineChart({ labels: labels30, tipLabels: tips30, series: [{ color: C.fat, values: series('restingHr') }], height: 180, tipFmt: v => v + ' bpm' })}</div>
        <div class="panel g-card wide" style="grid-column:span 6"><h2>Steps</h2>${barChart({ labels: labels30, tipLabels: tips30, series: [{ color: C.leaf, values: series('steps').map(v => v || 0) }], height: 180, unit: 'steps' })}</div>
        <div class="panel g-card wide" style="grid-column:span 6"><h2>Overnight HRV</h2>${lineChart({ labels: labels30, tipLabels: tips30, series: [{ color: '#A879D8', values: series('hrvNight') }], height: 180, tipFmt: v => v + ' ms' })}</div>
      </div>
      <div style="margin-top:22px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-action="g-sync" data-n="90" ${G.busy ? 'disabled' : ''}>Sync the last 90 days</button>
        ${P().garmin.mode !== 'apikey' ? '<button class="btn" data-action="g-usekey">Switch to a Personal API key</button>' : '<button class="btn" data-action="g-usekey">Replace the API key</button>'}
        <button class="btn ghost" data-action="g-logout">Disconnect Garmin</button>
      </div>
    </div>`;
    const gd = $('#gdate'); if (gd) gd.addEventListener('change', e => { if (e.target.value) { UI.date = e.target.value; render(); } });
  }

  async function handleViewAction(act, a) {
    if (act === 'f-add') {
      const code = ($('#fCode').value || '').trim();
      if (!code) { F.msg = 'Type their friend ID first.'; F.msgErr = true; return render(); }
      F.busy = true; F.msg = ''; render();
      try {
        const r = await social.addFriend(code);
        F.msgErr = !r.ok; F.msg = r.ok ? (r.status === 'accepted' ? `You and ${r.name} are now friends.` : `Request sent to ${r.name}. You'll both appear in the ranking once they accept.`) : r.error;
        if (r.ok) F.code = '';
      } catch (e) { F.msgErr = true; F.msg = e.offline ? 'You\'re offline.' : e.message; }
      F.busy = false; await loadFriends(true); render();
    }
    else if (act === 'f-accept') { try { await social.accept(a.dataset.id); toast('Friend added. Choose what they can see below.'); } catch (e) { toast(e.message); } await loadFriends(true); }
    else if (act === 'f-remove') {
      const f = (F.list || []).find(x => x.id === a.dataset.id);
      if (!confirm(`Remove ${f ? f.profile.name : 'this person'}? You'll stop seeing each other in the ranking.`)) return;
      try { await social.remove(a.dataset.id); } catch (e) { toast(e.message); }
      F.view = null; await loadFriends(true); render();
    }
    else if (act === 'f-view') { F.view = a.dataset.id; F.day = todayKey(); F.data = null; render(); main.scrollTop = 0; }
    else if (act === 'f-back') { F.view = null; F.data = null; render(); }
    else if (act === 'f-day') { F.day = addDays(F.day, Number(a.dataset.d)); if (F.day > todayKey()) F.day = todayKey(); F.data = null; render(); }
    else if (act === 'copy-code') { const c = window.MH_ME && window.MH_ME.friend_code; if (c) { try { await navigator.clipboard.writeText(c); toast('Friend ID copied: ' + c); } catch (_) { toast('Your friend ID is ' + c); } } }
    else if (act === 'set-color') { P().color = a.dataset.c; save(); render(); }
    else if (act === 'goal-restart') { const l = latestWeight(); P().profile.goalStart = l && l.date === todayKey() ? { date: todayKey(), kg: l.kg, real: true } : { date: todayKey(), kg: null }; save(); render(); toast(l && l.date === todayKey() ? 'Ranking restarted from today\'s weight.' : 'Ranking restarts from your next weigh-in.'); }
    else if (act === 'signout') { if (confirm('Sign out on this device? Your data stays in your account.')) social.signOut(); }
    else if (act === 'push-enable') { const r = await social.enablePush(); if (r.ok) { toast('Notifications are on.'); render(); } else { const m = $('#pushMsg'); if (m) { m.textContent = r.error; m.className = 'small err'; } } }
    else if (act === 'push-test') { const r = await social.testPush(); toast(r.ok ? (r.sent ? 'Test sent. It should pop up in a moment.' : 'No device is set up for notifications yet.') : (r.error || 'Could not send.')); }
    else if (act === 'dev-pick') { UI.device = a.dataset.id || null; G.err = ''; render(); }
    else if (act === 'trend') { UI.trendDays = Number(a.dataset.n); render(); }
    else if (act === 'plan-kcal') { P().profile.planKcal = Number(a.dataset.v); save(); render(); }
    else if (act === 'fc-range') { UI.forecastMonths = Math.min(12, Number(a.dataset.n)); render(); }
    else if (act === 'go-today') nav('today');
    else if (act === 'g-range') { UI.garminDays = Number(a.dataset.n); render(); }
    else if (act === 'g-sync') garminSync(Number(a.dataset.n));
    else if (act === 'g-setup') {
      G.setupBusy = true; G.err = ''; G.setupDetail = ''; G.setupMsg = 'Starting…'; render();
      const r = await api.garmin.setup();
      G.setupBusy = false; G.setupMsg = '';
      if (r.ok) { G.installed = true; G.checked = false; toast('Garmin is set up. You can connect your account now.'); }
      else { G.err = r.error || 'Setup failed.'; G.setupDetail = r.detail || ''; }
      render();
    }
    else if (act === 'g-usekey') { G.connected = false; G.method = 'key'; UI.device = 'garmin'; G.err = ''; render(); }
    else if (act === 'g-method') { G.method = a.dataset.m; G.err = ''; G.needMfa = false; if (G.method === 'signin') G.checked = false; render(); }
    else if (act === 'g-key') {
      const key = $('#gkey').value.trim(), exp = $('#gkeyexp').value;
      G.keyExp = exp;
      if (!key) { G.err = 'Paste the Personal API key from Garmin Connect.'; render(); return; }
      const pid = S.activeProfile, g = G;
      g.busy = true; g.err = ''; render();
      const r = await api.garmin.setKey(pid, key, exp + 'T12:00:00');
      g.busy = false;
      if (r.garmin) S.profiles[pid].garmin = r.garmin;
      if (g !== G) return;
      if (r.ok) { G.connected = true; G.expired = false; G.name = r.displayName; toast(`Garmin connected for ${P().name}. Fetching the last 30 days…`); garminSync(30, true); }
      else { G.err = r.error || 'Could not connect.'; render(); }
    }
    else if (act === 'g-login') {
      const email = $('#gemail').value.trim(), pass = $('#gpass').value;
      G.email = email;
      if (!email || !pass) { G.err = 'Enter your Garmin email and password.'; render(); return; }
      G.busy = true; G.err = ''; render();
      const r = await api.garmin.login(S.activeProfile, email, pass);
      G.busy = false;
      if (r.needMfa) { G.needMfa = true; render(); return; }
      afterLogin(r);
    }
    else if (act === 'g-mfa') {
      const code = $('#gcode').value.trim();
      if (!code) return;
      G.busy = true; G.err = ''; render();
      const r = await api.garmin.mfa(S.activeProfile, code);
      G.busy = false;
      if (r.needMfa) { G.err = 'That code was not accepted. Try again.'; render(); return; }
      afterLogin(r);
    }
    else if (act === 'g-logout') {
      if (!confirm('Disconnect Garmin? Your synced data stays in the app.')) return;
      const r = await api.garmin.logout(S.activeProfile);
      if (r && r.garmin) P().garmin = r.garmin;
      G.connected = false; G.name = null; P().garmin.displayName = null; render();
    }
    else handleFoodsSettingsAction(act, a);
  }

  function afterLogin(r) {
    G.needMfa = false;
    if (r.garmin) P().garmin = r.garmin;
    if (r.ok) {
      G.connected = true; G.expired = false; G.name = r.displayName; G.err = '';
      toast('Garmin connected. Fetching your last 30 days…');
      garminSync(30, true);
    } else { G.err = r.error || 'Could not connect.'; render(); }
  }

  // ---------------------------------------------------------------- FOODS
  function renderFoods() {
    const cats = ['All', 'My foods', ...new Set(BUILTIN.map(f => f.cat))];
    let list = UI.foodCat === 'My foods' ? S.customFoods : UI.foodCat === 'All' ? allFoods() : BUILTIN.filter(f => f.cat === UI.foodCat);
    if (UI.foodQ.trim()) list = searchFoods(UI.foodQ, list);
    main.innerHTML = `<div class="page">
      <div class="page-head">
        <div><h1>Food list</h1><p class="sub">${BUILTIN.length} common foods plus ${S.customFoods.length} of yours. Food is per 100 g, drinks per 100 ml.</p></div>
        <div style="display:flex;gap:8px"><input type="text" id="fq" placeholder="Filter foods" value="${esc(UI.foodQ)}" style="width:240px"><button class="btn primary" data-action="new-food">Create a food</button></div>
      </div>
      <div class="cat-tabs">${cats.map(c => `<button class="chip" data-action="cat" data-c="${esc(c)}" style="${c === UI.foodCat ? 'background:var(--leaf-soft);border-color:var(--leaf)' : ''}">${esc(c)}</button>`).join('')}</div>
      <div class="panel" style="padding:6px 12px">
        ${list.length ? `<table class="t"><thead><tr><th>Food</th><th>Typical portion</th><th class="n">kcal</th><th class="n">Protein</th><th class="n">Carbs</th><th class="n">Fat</th><th class="n">Fibre</th></tr></thead><tbody>
        ${list.slice(0, 400).map(f => `<tr class="clickable" data-action="food" data-id="${esc(f.id)}"><td>${esc(f.name)}${f.source !== 'Built-in' ? ` <span class="pill">${f.source === 'Mine' ? 'Mine' : esc(f.source)}</span>` : ''}</td><td class="muted">${f.portion ? `${esc(f.portionLabel || '')} · ${fmtAmt(f.portion, unitOf(f))}` : ''}${unitOf(f) === 'ml' ? ' <span class="pill">per 100 ml</span>' : ''}</td><td class="n">${fmt(f.n.kcal)}</td><td class="n">${fmt(f.n.p, 1)}</td><td class="n">${fmt(f.n.c, 1)}</td><td class="n">${fmt(f.n.f, 1)}</td><td class="n">${fmt(f.n.fib, 1)}</td></tr>`).join('')}
        </tbody></table>` : `<p class="muted" style="padding:14px 6px">${UI.foodCat === 'My foods' ? 'Foods you create, or add from an online search, are saved here.' : 'No foods match.'}</p>`}
      </div></div>`;
    const fq = main.querySelector('#fq');
    fq.addEventListener('input', () => {
      // Only swap the list, so the filter box keeps focus while typing.
      UI.foodQ = fq.value;
      const keep = main; const tmp = document.createElement('div');
      main = tmp; try { renderFoods(); } finally { main = keep; }
      const np = tmp.querySelector('.panel'), op = main.querySelector('.panel');
      if (np && op) op.replaceWith(np);
    });
  }

  function foodDetail(f) {
    const n = f.n;
    const rows = NKEYS.map(k => `<tr><td>${N_LABEL[k][0]}</td><td class="n">${n[k] == null ? '–' : fmtSmart(n[k]) + ' ' + N_LABEL[k][1]}</td></tr>`).join('');
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>${esc(f.name)}</h2><button class="btn ghost" data-f="close">Close</button></div>
      <div class="modal-body"><p class="muted small" style="margin-top:0">Per 100 ${unitOf(f)}${f.size ? ` · pack ${esc(f.size)}` : ''}${f.portion ? ` · ${esc(f.portionLabel || 'portion')} ≈ ${fmtAmt(f.portion, unitOf(f))}` : ''} · ${esc(f.source === 'Built-in' ? 'Food list' : f.source === 'Mine' ? 'My food' : f.source)}</p>
      <table class="t">${rows}</table></div>
      <div class="modal-foot">${f.source !== 'Built-in' ? `<button class="btn danger" data-f="del">Delete</button>${f.source === 'Mine' ? '<button class="btn" data-f="edit">Edit</button>' : ''}` : ''}<button class="btn primary" data-f="log">Log this food</button></div>`;
    modal.hidden = false;
    card.onclick = (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      if (b.dataset.f === 'close') closeModal();
      if (b.dataset.f === 'log') { closeModal(); openAdd({ date: UI.date, meal: guessMeal(), food: f }); }
      if (b.dataset.f === 'edit') foodForm(f);
      if (b.dataset.f === 'del') {
        S.customFoods = S.customFoods.filter(c => c.id !== f.id);
        save(); closeModal(); render(); toast(`Deleted ${f.name} from your foods. Past diary entries keep their values.`);
      }
    };
  }

  function foodForm(f, opts) {
    opts = opts || {};
    const n = (f && f.n) || {};
    const fields = [['kcal', 'Calories', 'kcal'], ['p', 'Protein', 'g'], ['c', 'Carbohydrate', 'g'], ['f', 'Fat', 'g'], ['fib', 'Fibre', 'g'], ['sug', 'of which sugars', 'g'], ['sat', 'of which saturates', 'g'], ['salt', 'Salt', 'g']];
    const extra = ['k', 'ca', 'fe', 'mg', 'zn', 'ph', 'se', 'io', 'cu', 'va', 'vc', 'vd', 've', 'vk', 'b1', 'b2', 'b3', 'b6', 'b12', 'fol', 'ch', 'epa', 'ala', 'la'];
    const val = k => k === 'salt' ? (n.na == null ? '' : +(n.na * 2.5 / 1000).toFixed(2)) : (n[k] ?? '');
    card.className = 'modal-card';
    card.style.width = 'min(760px,100%)';
    card.innerHTML = `<div class="modal-head"><h2>${f ? 'Edit food' : 'Create a food'}</h2><button class="btn ghost" data-f="close">Close</button></div>
      <div class="modal-body">
        <p class="muted" style="margin-top:0">Copy the "per 100 g" column from the label (drinks: "per 100 ml"). Only name and calories are required.</p>
        <label class="check" style="margin-bottom:12px"><input type="checkbox" id="ff-liquid" ${f && unitOf(f) === 'ml' ? 'checked' : ''}> This is a drink or other liquid (measured in ml)</label>
        <div class="form-grid" style="grid-template-columns:2fr 1fr 1fr">
          <label class="field"><span>Name</span><input type="text" id="ff-name" value="${esc(f ? f.name : '')}"></label>
          <label class="field"><span>Portion size (g or ml, optional)</span><input type="number" id="ff-portion" value="${f && f.portion ? f.portion : ''}"></label>
          <label class="field"><span>Portion name (optional)</span><input type="text" id="ff-plabel" value="${esc(f && f.portionLabel ? f.portionLabel : '')}" placeholder="e.g. 1 bar"></label>
        </div>
        <h3 style="margin-top:18px">Per 100 g or 100 ml</h3>
        <div class="form-grid">${fields.map(([k, l, u]) => `<label class="field"><span>${l} (${u})</span><input type="number" step="any" min="0" data-k="${k}" value="${val(k)}"></label>`).join('')}</div>
        <details style="margin-top:16px"><summary class="muted" style="cursor:pointer">Vitamins & minerals (optional)</summary>
          <div class="form-grid" style="margin-top:12px">${extra.map(k => `<label class="field"><span>${N_LABEL[k][0]} (${N_LABEL[k][1]})</span><input type="number" step="any" min="0" data-k="${k}" value="${val(k)}"></label>`).join('')}</div>
        </details>
        <div class="err" id="ff-err"></div>
      </div>
      <div class="modal-foot"><button class="btn" data-f="close">Cancel</button><button class="btn primary" data-f="save">Save food</button></div>`;
    modal.hidden = false;
    card.onclick = (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      if (b.dataset.f === 'close') { card.style.width = ''; closeModal(); return; }
      if (b.dataset.f !== 'save') return;
      const name = $('#ff-name').value.trim();
      const nn = {}; NKEYS.forEach(k => nn[k] = null);
      card.querySelectorAll('input[data-k]').forEach(i => {
        const v = i.value === '' ? null : Number(i.value);
        if (i.dataset.k === 'salt') nn.na = v == null ? null : v * 400; else nn[i.dataset.k] = v;
      });
      if (!name || nn.kcal == null) { $('#ff-err').textContent = 'Add a name and the calories per 100 g (or 100 ml).'; return; }
      ['p', 'c', 'f'].forEach(k => { if (nn[k] == null) nn[k] = 0; });
      const portion = Number($('#ff-portion').value) || null;
      const food = { id: f ? f.id : (opts.barcode ? 'bc:' + opts.barcode : 'my:' + uid()), barcode: opts.barcode || (f && f.barcode) || null, name, cat: 'My foods', source: 'Mine', unit: $('#ff-liquid').checked ? 'ml' : 'g', portion, portionLabel: $('#ff-plabel').value.trim() || (portion ? 'portion' : null), n: nn };
      if (f) S.customFoods = S.customFoods.map(c => c.id === f.id ? food : c); else S.customFoods.unshift(food);
      save(); card.style.width = ''; closeModal();
      if (opts.then) { opts.then(food); return; }
      UI.foodCat = 'My foods'; render(); toast(`Saved ${name}.`);
    };
  }

  // ---------------------------------------------------------------- SETTINGS
  function renderSettings() {
    const p = P().profile, at = autoTargets(p), tg = targets(), st = S.settings, me = window.MH_ME || {};
    const act = [[1.2, 'Mostly sitting (desk job, little exercise)'], [1.375, 'Lightly active (exercise 1–3 days a week)'], [1.55, 'Active (exercise 3–5 days a week)'], [1.725, 'Very active (hard exercise 6–7 days)'], [1.9, 'Extremely active (physical job + training)']];
    const colors = ['#E0263A', '#FF8A1F', '#2D5FC0', '#8B55E6', '#D63384', '#1B8A9A', '#1E7656', '#4A4F57'];
    const pts = myPoints(), gs = social.startOf(S), gsSet = !!p.goalStart;
    const pushState = social.pushState();
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Settings</h1><p class="sub">Changes save automatically and sync to your other devices.</p></div></div>
      <div class="settings-grid">
        <div class="stack">
        <div class="panel">
          <h2>Your account</h2>
          <div class="form-grid" style="grid-template-columns:1fr">
            <label class="field"><span>Name (what friends see)</span><input type="text" id="pName" value="${esc(P().name)}" maxlength="40"></label>
          </div>
          <div class="swatches">${colors.map(c => `<button class="sw-btn ${P().color === c ? 'on' : ''}" style="background:${c}" data-action="set-color" data-c="${c}" aria-label="Colour ${c}"></button>`).join('')}</div>
          <div class="kv" style="margin-top:14px"><span>Friend ID</span><span><b class="code-pill" data-action="copy-code" title="Tap to copy">${esc(me.friend_code || '…')}</b></span><span>Signed in as</span><span>${esc((window.MH_EMAIL) || '')}</span></div>
          <button class="btn ghost danger" style="margin-top:12px" data-action="signout">Sign out</button>
        </div>
        <div class="panel">
          <h2>Goal and ranking</h2>
          <div class="form-grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
            <label class="field"><span>Goal</span><select data-p="goal">${[['lose', 'Lose weight (~0.5 kg/week)'], ['lose-slow', 'Lose slowly (~0.25 kg/week)'], ['maintain', 'Maintain'], ['gain', 'Gain weight (small surplus)']].map(([v, l]) => `<option value="${v}" ${p.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Goal weight (kg)</span><input type="number" data-p="goalWeightKg" value="${p.goalWeightKg ?? ''}" min="30" max="250" step="0.1" ${p.goal === 'maintain' ? 'placeholder="not needed"' : ''}></label>
          </div>
          <div class="kv" style="margin-top:14px"><span>Start weight</span><span>${gs ? `${fmt(gs.kg, 1)} kg on ${esc(shortDate(gs.date))}` : gsSet ? 'your next weigh-in' : 'set when you choose a goal'}</span><span>Now</span><span>${latestWeight() ? fmt(latestWeight().kg, 1) + ' kg' : 'no weigh-in yet'}</span><span>Ranking points</span><span><b>${pts == null ? '–' : fmt(pts, 1) + '%'}</b></span></div>
          <p class="muted small">Points = how far you are from your start weight to your goal weight. Friends always see your points; your actual weight is only shown to friends you allow.</p>
          ${gsSet ? '<button class="btn ghost" data-action="goal-restart">Restart from today\'s weight</button>' : ''}
        </div>
        <div class="panel">
          <h2>Your details and targets</h2>
          <div class="form-grid">
            <label class="field"><span>Sex</span><select data-p="sex"><option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
            <label class="field"><span>Age</span><input type="number" data-p="age" value="${p.age}" min="14" max="100"></label>
            <label class="field"><span>Height (cm)</span><input type="number" data-p="heightCm" value="${p.heightCm}" min="120" max="230"></label>
            <label class="field"><span>Weight (kg)</span><input type="number" data-p="weightKg" value="${currentWeight()}" min="30" max="250" step="0.1" title="Updated automatically from your latest weigh-in"></label>
          </div>
          <div class="form-grid" style="grid-template-columns:1fr;margin-top:12px">
            <label class="field"><span>Activity</span><select data-p="activity">${act.map(([v, l]) => `<option value="${v}" ${p.activity == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
          <div class="form-grid" style="margin-top:12px;grid-template-columns:1fr 1fr">
            <label class="field"><span>Protein (g per kg)</span><input type="number" data-p="proteinPerKg" value="${p.proteinPerKg}" min="0.8" max="3" step="0.1"></label>
            <label class="field"><span>Fat (% of calories)</span><input type="number" data-p="fatPct" value="${p.fatPct}" min="15" max="50"></label>
          </div>
          <label class="check" style="margin-top:16px"><input type="checkbox" id="ownTargets" ${P().targets.auto ? '' : 'checked'}> Set my own calorie and macro targets</label>
          ${P().targets.auto ? `<div class="targets-out"><div><b>${fmt(at.kcal)}</b><span>kcal / day</span></div><div><b>${fmt(at.p)} g</b><span>protein</span></div><div><b>${fmt(at.c)} g</b><span>carbs</span></div><div><b>${fmt(at.f)} g</b><span>fat</span></div></div>
            <p class="muted small">Based on the Mifflin-St Jeor formula: about ${fmt(at.bmr)} kcal at rest, times your activity level${p.goal !== 'maintain' ? ', adjusted for your goal' : ''}.</p>`
            : `<div class="form-grid" style="margin-top:12px">
              <label class="field"><span>Calories (kcal)</span><input type="number" data-t="kcal" value="${tg.kcal}"></label>
              <label class="field"><span>Protein (g)</span><input type="number" data-t="p" value="${tg.p}"></label>
              <label class="field"><span>Carbs (g)</span><input type="number" data-t="c" value="${tg.c}"></label>
              <label class="field"><span>Fat (g)</span><input type="number" data-t="f" value="${tg.f}"></label></div>
              <p class="muted small">Your macros add up to ${fmt(tg.p * 4 + tg.c * 4 + tg.f * 9)} kcal.</p>`}
        </div>
        </div>

        <div class="stack">
          <div class="panel">
            <h2>Notifications on this device</h2>
            <p class="muted small" style="margin-top:0">Get a notification when a friend logs food (if they allow it) or sends you a friend request.${/iPhone|iPad/.test(navigator.userAgent) ? ' On iPhone this works from the Home Screen app.' : ''}</p>
            ${pushState === 'granted' ? '<p class="small"><b>On.</b></p><button class="btn" data-action="push-test">Send me a test</button>' : pushState === 'denied' ? '<p class="small err">Blocked. Allow notifications for this app in your phone or browser settings.</p>' : '<button class="btn primary" data-action="push-enable">Turn on notifications</button>'}
            <div id="pushMsg" class="small" style="margin-top:8px"></div>
          </div>
          ${window.desktop ? `<div class="panel">
            <h2>Daily reminder</h2>
            <label class="check" style="margin-bottom:8px"><input type="checkbox" data-rem="me" ${P().reminderOn ? 'checked' : ''}> Remind me to log food</label>
            <label class="field" style="margin-top:12px;max-width:180px"><span>Reminder time</span><input type="time" data-s="reminderTime" value="${esc(st.reminderTime)}"></label>
            <p class="muted small">One notification a day at this time on this PC, unless the day is already marked complete.</p>
          </div>
          <div class="panel">
            <h2>Windows app</h2>
            <label class="check"><input type="checkbox" data-s="startWithWindows" ${st.startWithWindows ? 'checked' : ''}> Start with Windows (in the background, for reminders)</label>
            <p class="muted small">Version ${esc(window.desktop.version || '')}. The app's screens update by themselves.</p>
          </div>` : ''}
          <div class="panel">
            <h2>Appearance</h2>
            <label class="field" style="max-width:220px"><span>Theme</span><select data-s="theme">${[['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<option value="${v}" ${st.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
          <div class="panel">
            <h2>Online food search</h2>
            <p class="muted small" style="margin-top:0">Open Food Facts needs no setup. The USDA database works without a key but allows only a few searches an hour; a free personal key removes that limit.</p>
            <label class="field"><span>USDA API key (optional)</span><input type="text" data-s="usdaKey" value="${esc(st.usdaKey)}" placeholder="Paste your free key"></label>
            <p class="small"><a href="https://fdc.nal.usda.gov/api-key-signup" target="_blank">Get a free USDA key</a></p>
          </div>
          <div class="panel">
            <h2>Your data</h2>
            <p class="muted small" style="margin-top:0">Saved on this device and in your account, so it's the same on every device you sign in on. ${SYNC.error ? `<span class="err">${esc(SYNC.error)}</span>` : SYNC.lastSync ? 'Last synced ' + esc(new Date(SYNC.lastSync).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) + '.' : ''}</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="sync-now">Sync now</button><button class="btn" data-action="export">Save a backup</button><button class="btn" data-action="import">Restore a backup</button></div>
          </div>
        </div>
      </div>
      <p class="faint small" style="margin-top:20px">Mabrouka Tracker v${esc(VERSION)}. Nutrition values are averages from USDA FoodData Central and UK product labels; targets are general adult guidance, not medical advice.</p>
    </div>`;

    main.querySelectorAll('[data-p]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.p; let v = el.value;
      if (k === 'goalWeightKg' && v === '') { P().profile.goalWeightKg = null; save(); softRender(renderSettings); return; }
      if (!['sex', 'goal'].includes(k)) v = Number(v);
      if (typeof v === 'number' && !(v > 0)) return;
      const goalChange = (k === 'goal' && v !== P().profile.goal) || (k === 'goalWeightKg' && v !== P().profile.goalWeightKg);
      P().profile[k] = v; P().setupDone = true;
      if (k === 'weightKg') P().weights[todayKey()] = Math.round(v * 10) / 10;
      if (goalChange || (!P().profile.goalStart && (k === 'goal' || k === 'goalWeightKg'))) { const l = latestWeight(); P().profile.goalStart = l && l.date >= addDays(todayKey(), -3) ? { date: l.date, kg: l.kg, real: true } : { date: todayKey(), kg: null }; }
      save(); softRender(renderSettings);
    }));
    main.querySelectorAll('[data-t]').forEach(el => el.addEventListener('change', () => { const v = Number(el.value); if (v >= 0) { P().targets[el.dataset.t] = v; save(); softRender(renderSettings); } }));
    $('#ownTargets').addEventListener('change', e => {
      if (e.target.checked) { const a = autoTargets(P().profile); P().targets = { auto: false, kcal: a.kcal, p: a.p, c: a.c, f: a.f }; }
      else P().targets.auto = true;
      save(); softRender(renderSettings);
    });
    $('#pName').addEventListener('change', e => { const v = e.target.value.trim(); if (v) { P().name = v; save(); softRender(render); } });
    main.querySelectorAll('[data-rem]').forEach(el => el.addEventListener('change', () => { P().reminderOn = el.checked; save(); }));
    main.querySelectorAll('[data-s]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.s;
      S.settings[k] = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (k === 'theme') { applyTheme(); }
      if (k === 'startWithWindows' && window.desktop && window.desktop.setStartup) window.desktop.setStartup(el.checked);
      save(); softRender(renderSettings);
    }));
  }

  async function handleFoodsSettingsAction(act, a) {
    if (act === 'sync-connect') {
      const url = $('#syUrl').value, key = $('#syKey').value, email = $('#syEmail').value, pass = $('#syPass').value;
      UI.syncBusy = true; UI.syncErr = ''; renderSettings();
      clearTimeout(saveTimer); saveTimer = null; await api.save(S, REV);
      const r = await api.sync.connect(url, key, email, pass);
      UI.syncBusy = false;
      if (r.ok) { SYNC = { ...r.status, email }; toast('Phone sync is on.'); } else UI.syncErr = r.error;
      renderSettings(); renderSideFoot(); return;
    }
    if (act === 'sync-now') { SYNC = await api.sync.now(); renderSettings(); renderSideFoot(); return; }
    if (act === 'sync-off') { if (!confirm('Turn off phone sync on this PC? Nothing is deleted.')) return; SYNC = await api.sync.disconnect(); renderSettings(); renderSideFoot(); return; }
    if (act === 'cat') { UI.foodCat = a.dataset.c; renderFoods(); }
    else if (act === 'food') { const f = allFoods().find(x => x.id === a.dataset.id); if (f) foodDetail(f); }
    else if (act === 'new-food') foodForm(null);
    else if (act === 'export') { const r = await api.exportData(); if (r.ok) toast('Backup saved.'); }
    else if (act === 'import') {
      if (!confirm('Restore a backup? This replaces everything currently in the app.')) return;
      const r = await api.importData();
      if (r.ok) { S = r.state; applyTheme(); render(); toast('Backup restored.'); } else if (r.error) toast(r.error);
    }
    else if (act === 'open-data') api.openDataFolder();
    else if (act === 'upd-folder') api.update.openFolder();
    else if (act === 'upd-notes' && S.lastUpdate) showWhatsNew(S.lastUpdate, true);
    else if (act === 'upd-check') {
      const r = await api.update.check();
      const box = $('#updMsg');
      if (r.applying) toast('Installing the update…');
      else if (r.message) { if (box) box.textContent = r.message; }
      else toast(`You're on the newest version, v${VERSION}.`);
    }
  }

  function showWhatsNew(u, again) {
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>Updated to v${esc(u.version)}</h2><button class="btn ghost" data-f="close">Close</button></div>
      <div class="modal-body"><p class="muted" style="margin-top:0">Mabrouka Tracker updated itself${u.from ? ' from v' + esc(u.from) : ''}. What's new:</p>
      <ul class="whatsnew">${(u.notes || []).map(n => `<li>${esc(n)}</li>`).join('') || '<li>Small fixes and improvements.</li>'}</ul></div>
      <div class="modal-foot"><button class="btn primary" data-f="close">Got it</button></div>`;
    modal.hidden = false;
    card.onclick = (e) => { if (e.target.closest('[data-f="close"]')) closeModal(); };
    if (!again) { api.update.seen(); S.lastUpdate.shown = true; }
  }

  // ---------------------------------------------------------------- start
  render();
  // Quietly bring in the latest Garmin days when the app opens, then every 3 hours.
  const connectedPids = () => Object.values(S.profiles).filter(p => p.garmin.displayName || p.garmin.lastSync).map(p => p.id);
  setTimeout(async () => { for (const pid of connectedPids()) await quietSync(pid, 3); }, 1500);
  setInterval(async () => { for (const pid of connectedPids()) await quietSync(pid, 2); }, 3 * 3600 * 1000);

  loadFriends(); loadNotes();
  // Check for friend requests, accepts and food notices every few seconds while the app is open.
  setInterval(() => { if (document.visibilityState === 'visible') loadNotes(); }, 8000);
  setInterval(() => { if (document.visibilityState === 'visible' && UI.view === 'friends' && !F.view) loadFriends(true); }, 15000);
  // Windows app: daily reminder at the chosen time.
  if (window.desktop) setInterval(() => {
    const now = new Date(), key = todayKey();
    if (!P().reminderOn || S.lastReminder === key) return;
    const [h, m] = (S.settings.reminderTime || '21:00').split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
    S.lastReminder = key; save();
    if (P().dayMeta[key] && P().dayMeta[key].complete) return;
    const n = dayEntries(key).length;
    try { const no = new Notification(n ? 'Finish today\'s food log' : 'What did you eat today?', { body: n ? `You've logged ${n} item${n === 1 ? '' : 's'}. Add anything missing, then mark the day complete.` : "You haven't logged anything today." }); no.onclick = () => { window.desktop.show && window.desktop.show(); nav('today'); }; } catch (_) {}
  }, 60000);

  // Updates: save everything before the app restarts, then say what changed.
  api.update.onRestarting(v => {
    clearTimeout(saveTimer);
    api.save(S, REV);
    toast(`Installing update v${v}. The app restarts in a moment…`);
  });
  if (S.lastUpdate && S.lastUpdate.version === VERSION && !S.lastUpdate.shown) {
    setTimeout(() => showWhatsNew(S.lastUpdate), 600);
  }
  // Roll the diary over to the new day if the app stays open past midnight.
  let lastDay = todayKey();
  setInterval(() => { const t = todayKey(); if (t !== lastDay) { if (UI.date === lastDay) UI.date = t; lastDay = t; if (modal.hidden) render(); } }, 60000);
})();
