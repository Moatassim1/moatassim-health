// Moatassim Health - interface
(async function () {
  'use strict';
  const api = window.api;
  const social = window.social;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Supplements'];
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
  const entryAmount = e => e.quick ? 'quick add' : e.count != null && e.each ? countLabel(e.count, e.each) : fmtAmt(e.grams, unitOf(e));
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
  // Vitamins and minerals only (not macros, fibre, sugar, salt). How many does an entry have data for?
  const VIT_KEYS = ['k', 'ca', 'fe', 'mg', 'zn', 'va', 'vc', 'vd', 've', 'vk', 'b6', 'b12', 'fol', 'se', 'io', 'ph', 'cu', 'b1', 'b2', 'b3', 'ch'];
  function vitCoverage(e) { const n = e.n || {}; return VIT_KEYS.filter(k => n[k] != null).length / VIT_KEYS.length; }
  function vitBadge(e) {
    const c = vitCoverage(e);
    if (c === 0) return '<span class="vit-badge none" title="No vitamin or mineral data for this item, so it adds nothing to your vitamins below.">no vitamins</span>';
    if (c < 0.4) return '<span class="vit-badge part" title="Only some vitamin and mineral data for this item, so your vitamin totals below may be a little low.">some vitamins</span>';
    return '';
  }
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
  // ---------------------------------------------------------------- targets: automatic, planned or own; training vs rest days
  const r5 = v => Math.round(v / 5) * 5;
  const weekday = k => dateOf(k).getDay(); // 0 = Sunday
  function dayType(k) {
    const T = P().targets, m = (P().dayMeta[k] || {}).dayType;
    if (m === 'train' || m === 'rest') return m;
    if (Array.isArray(T.trainDays) && T.trainDays.length) return T.trainDays.includes(weekday(k)) ? 'train' : 'rest';
    return 'train';
  }
  const splitOn = () => { const T = P().targets; return !T.auto && T.split && T.rest && T.rest.kcal > 0; };
  function targets(k) {
    const T = P().targets;
    if (T.auto) return autoTargets(P().profile);
    const base = { kcal: T.kcal, p: T.p, c: T.c, f: T.f };
    if (splitOn() && dayType(k || UI.date || todayKey()) === 'rest') return { ...T.rest };
    return base;
  }
  const macroKcal = m => Math.round(m.p * 4 + m.c * 4 + m.f * 9);
  // Suggest daily macros for a goal, target weight and time frame.
  function planMacros({ goal, goalKg, weeks }) {
    const pr = P().profile, w = currentWeight() || pr.weightKg, met = metabolismModel();
    const formula = bmrFor(w, pr) * pr.activity;
    const useLogs = met.ready && met.confidence !== 'early';
    const maint = Math.round((useLogs ? met.measured : formula) / 10) * 10;
    const floor = Math.max(pr.sex === 'female' ? 1200 : 1500, Math.round(bmrFor(w, pr) * 0.95 / 10) * 10);
    const warn = [];
    let kcal = maint, rate = 0; // kg per week (negative = losing)
    goalKg = Number(goalKg) || w; weeks = Math.max(1, Number(weeks) || 12);
    if (goal === 'cut') {
      const want = Math.max(0, w - goalKg) / weeks, max = w * 0.01;
      if (want > max) warn.push(`Losing ${fmt(want, 2)} kg a week is faster than the safe maximum of about 1% of your weight (${fmt(max, 2)} kg). The plan uses ${fmt(max, 2)} kg a week, so it takes about ${Math.ceil((w - goalKg) / max)} weeks.`);
      rate = -Math.min(want, max);
      kcal = maint + rate * KCAL_PER_KG / 7;
      if (kcal < floor) { warn.push(`That would need under ${fmt(floor)} kcal a day, which is too low to keep up. The plan stops at ${fmt(floor)} kcal, so it will take longer.`); kcal = floor; rate = (kcal - maint) * 7 / KCAL_PER_KG; }
    } else if (goal === 'bulk') {
      const want = Math.max(0, goalKg - w) / weeks, max = w * 0.005;
      if (want > max) warn.push(`Gaining ${fmt(want, 2)} kg a week would mostly be fat. The plan uses about ${fmt(max, 2)} kg a week (0.5% of your weight), so it takes about ${Math.ceil((goalKg - w) / max)} weeks.`);
      rate = Math.min(want, max) || w * 0.0025;
      kcal = maint + rate * KCAL_PER_KG / 7;
    } else if (goal === 'recomp') { kcal = maint - 200; rate = -0.1; }
    kcal = Math.round(kcal / 10) * 10;
    const pf = goal === 'cut' ? 1.9 : goal === 'recomp' ? 2.0 : goal === 'bulk' ? 1.8 : 1.6;
    const p = r5(Math.min(pf * w, 2.3 * Math.max(goalKg, w * 0.8)));
    const f = r5(Math.max(kcal * 0.3 / 9, 0.6 * w * 0.8));
    const c = Math.max(50, r5((kcal - p * 4 - f * 9) / 4));
    const train = { p, c, f }; train.kcal = macroKcal(train);
    const rest = { p, c: Math.max(40, c - 40), f: f + 15 }; rest.kcal = macroKcal(rest);
    const weeksNeeded = rate ? Math.abs((goalKg - w) / rate) : null;
    return { goal, goalKg, weeks, maint, maintSource: useLogs ? 'logs' : 'formula', rate: Math.round(rate * 100) / 100, train, rest, warn, startKg: w, weeksNeeded };
  }
  // Weekly check-in: compare real weight change with the plan and suggest a tweak.
  function weeklyCheck() {
    const T = P().targets, plan = T.plan, today = todayKey();
    if (T.auto || !plan || T.suggestion) return;
    if (T.lastCheck && (dateOf(today) - dateOf(T.lastCheck)) / 864e5 < 7) return;
    if ((dateOf(today) - dateOf(plan.start)) / 864e5 < 14) return;
    const win = rangeKeys(today, 14).filter(k => k !== today);
    const days = countedDays(win);
    const weighIns = weightKeys().filter(k => k >= win[0]).length;
    if (days.length < 7 || weighIns < 4) return;
    const eaten = days.reduce((a, k) => a + totalsOf(dayEntries(k)).kcal, 0) / days.length;
    const aimed = days.reduce((a, k) => a + targets(k).kcal, 0) / days.length;
    const pg = social.progressOf ? social.progressOf(S) : {}, actual = pg.perWeek;
    if (actual == null) return;
    const cur = { train: { kcal: T.kcal, p: T.p, c: T.c, f: T.f }, rest: T.rest ? { ...T.rest } : null };
    let delta = 0, reason = '';
    const planned = plan.rate || 0;
    if (eaten > aimed * 1.08) {
      T.suggestion = { at: today, info: true, reason: `You averaged ${fmt(eaten)} kcal a day over the last 2 weeks, about ${fmt(eaten - aimed)} above your target. Your weight changed ${actual >= 0 ? '+' : ''}${fmt(actual, 2)} kg a week. Try to hit your current targets for another week before changing them.` };
    } else {
      const diff = actual - planned;
      if (plan.goal === 'cut') { if (diff > 0.2) delta = -150; else if (diff < -0.4) delta = 150; }
      else if (plan.goal === 'bulk') { if (diff < -0.15) delta = 150; else if (diff > 0.25) delta = -150; }
      else if (Math.abs(actual - planned) > 0.3) delta = actual > planned ? -150 : 150;
      if (delta) {
        reason = `Plan: ${planned >= 0 ? '+' : ''}${fmt(planned, 2)} kg a week. Last 2–3 weeks: ${actual >= 0 ? '+' : ''}${fmt(actual, 2)} kg a week, while you ate close to target (${fmt(eaten)} kcal a day). ${delta < 0 ? 'Progress is slower than planned, so eat about 150 kcal less.' : 'You are moving faster than planned, so eat about 150 kcal more to protect muscle and energy.'}`;
        const adj = m => { if (!m) return null; const o = { ...m, c: Math.max(40, m.c + (delta < 0 ? -25 : 25)), f: Math.max(30, m.f + (delta < 0 ? -5 : 5)) }; o.kcal = macroKcal(o); return o; };
        T.suggestion = { at: today, reason, delta, to: { train: adj(cur.train), rest: adj(cur.rest) }, from: cur };
      }
    }
    T.lastCheck = today;
    save();
    if (T.suggestion) toast(T.suggestion.info ? 'Weekly check-in: see the note on your diary.' : 'Weekly check-in: a macro change is suggested on your diary.');
  }

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
  // Save straight away when the app is closed or sent to the background, so the last edit is never lost.
  const flushSave = () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; api.save(S, REV); } };
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });


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
    const norm = x => x.toLowerCase().replace(/['’`]/g, '');
    q = norm(q.trim());
    if (!q) return [];
    const toks = q.split(/\s+/);
    const scored = [];
    for (const f of list) {
      const hay = norm(f.name + ' ' + (f.cat || ''));
      if (!toks.every(t => hay.includes(t))) continue;
      const nm = norm(f.name), words = nm.split(/[\s,()/-]+/);
      let s = 0;
      if (nm.startsWith(q)) s += 50;
      if (words.some(w => w.startsWith(toks[0]))) s += 20;
      s += 30 * toks.filter(t => words.includes(t)).length / toks.length; // whole-word match: "b1" beats "b12"
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
    const items = [['photos', 'Transformation', 'Daily progress photos and videos'], ['garmin', 'Devices', 'Garmin and other watches'], ['foods', 'Food list', 'All foods, and your own'], ['forecast', 'Weight projection', 'Where your weight is heading'], ['settings', 'Settings', 'Account, goal, targets, notifications']];
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

  document.title = 'GG Gains';
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
    const html = `<button class="me-card" data-act2="go-settings">${avatarHtml({ name: P().name, color: P().color, avatar: P().avatar, tier: GAME ? gc().tier.id : null })}<span class="pname">${esc(P().name)}<small>${pts == null ? 'Set a goal to rank' : fmt(pts, 1) + '% to goal'}</small></span></button>
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
    if (GAME) GAME.invalidate();
    renderMe();
    document.querySelectorAll('#tabbar button[data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === UI.view || (b.dataset.view === 'more' && ['garmin', 'foods', 'forecast', 'settings', 'photos'].includes(UI.view))));
    renderSideFoot();
    const v = UI.view;
    if (v === 'today') renderToday();
    else if (v === 'trends') renderTrends();
    else if (v === 'forecast') renderForecast();
    else if (v === 'garmin') renderGarmin();
    else if (v === 'foods') renderFoods();
    else if (v === 'settings') renderSettings();
    else if (v === 'friends') renderFriends();
    else if (v === 'photos') renderPhotos();
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
  // Water and exercise, stored with the day so they sync.
  const EXERCISES = [['Running', 9.8], ['Walking', 3.5], ['Cycling', 7.5], ['Gym / weights', 5], ['HIIT / circuits', 8], ['Swimming', 7], ['Football', 7], ['Padel / tennis', 7], ['Sauna (80°C)', 1.5], ['Other', 5]];
  const waterGoal = () => Math.max(1500, Math.round((currentWeight() || 75) * 35 / 250) * 250);
  // Walking: about 0.5 kcal per kg of body weight per km above resting (ACSM walking equation).
  // Distance is Garmin's when it has it, otherwise steps x stride (stride ≈ 41.5% of height).
  function walkKcal(gd) {
    const pr = P().profile, kg = currentWeight() || pr.weightKg || 75;
    const stride = (pr.heightCm || 175) * (pr.sex === 'female' ? 0.413 : 0.415) / 100;
    const km = gd.distanceKm || (gd.steps * stride / 1000);
    return { km, kcal: Math.round(0.5 * kg * km) };
  }
  const actIcon = t => /swim/.test(t) ? '🏊' : /run/.test(t) ? '🏃' : /cycl|bik|ride/.test(t) ? '🚴' : /walk|hik/.test(t) ? '🚶' : /strength|weight|gym|hiit|cardio/.test(t) ? '🏋️' : /yoga|pilates|breath/.test(t) ? '🧘' : '⚡';
  function waterExerciseCard(k) {
    const m = P().dayMeta[k] || {}, ml = m.water || 0, goal = waterGoal();
    const ex = m.ex || [];
    const exK = ex.reduce((a, x) => a + (x.kcal || 0), 0);
    const gd = P().garmin.days[k];
    return `<div class="panel water-card">
      <h2>Water</h2>
      <div class="water-row"><div class="water-num num">${fmtAmt(ml, 'ml')}<small> / ${fmtAmt(goal, 'ml')}</small></div>
        <div class="water-btns"><button class="btn" data-action="water" data-ml="-250" aria-label="Remove a glass">−</button><button class="btn" data-action="water" data-ml="250">+ Glass</button><button class="btn" data-action="water" data-ml="500">+ Bottle</button></div></div>
      <div class="water-bar"><i style="width:${Math.min(100, ml / goal * 100)}%"></i></div>
      <h2 style="margin-top:18px">Exercise</h2>
      ${gd && gd.steps != null ? (() => { const w = walkKcal(gd); return `<div class="steps-row"><span>👟 <b class="num">${fmt(gd.steps)}</b> steps <span class="faint">· ${fmt(w.km, 1)} km</span></span><span class="walk-kcal" title="Calories burned walking, on top of what your body burns at rest. Worked out from your weight and ${gd.distanceKm ? 'the distance your Garmin measured' : 'your stride length (from your height)'}."><b class="num">${fmt(w.kcal)}</b> kcal</span></div>${gd.stepGoal ? `<div class="water-bar steps-bar"><i style="width:${Math.min(100, gd.steps / gd.stepGoal * 100)}%"></i></div><div class="faint small" style="margin-top:4px">Goal ${fmt(gd.stepGoal)} steps · calories burned walking, from your weight and ${gd.distanceKm ? 'Garmin distance' : 'height'}</div>` : ''}`; })() : ''}
      ${gd && (gd.activities || []).length ? `<div class="faint small" style="margin:10px 0 2px">From your Garmin</div><ul class="ex-list g-acts">${gd.activities.map(x => `<li><span>${actIcon(x.type)} <b>${esc(x.name)}</b> <span class="faint">${[x.start, x.min != null ? fmt(x.min) + ' min' : '', x.km ? fmt(x.km, x.km < 2 ? 2 : 1) + ' km' : ''].filter(Boolean).join(' · ')}</span></span><span class="num">${x.kcal != null ? fmt(x.kcal) + ' kcal' : ''}</span></li>`).join('')}</ul>` : ''}
      ${ex.length ? `<ul class="ex-list">${ex.map(x => `<li><span><b>${esc(x.name)}</b> <span class="faint">${fmt(x.min)} min</span></span><span class="num">${fmt(x.kcal)} kcal</span><button class="btn ghost j-x" data-action="ex-del" data-id="${esc(x.id)}" aria-label="Remove">✕</button></li>`).join('')}</ul><p class="small muted" style="margin:4px 0 10px">${fmt(exK)} kcal burned in workouts${gd && gd.kcalTotal != null ? ' · already part of your Garmin total, so it isn\'t added again' : ''}.</p>` : (gd && (gd.activities || []).length ? '' : '<p class="muted small" style="margin-top:0">Log a workout to keep a record of it. Workouts recorded on your Garmin show up here by themselves.</p>')}
      <div class="ex-form">
        <select id="exAct">${EXERCISES.map(([n]) => `<option>${n}</option>`).join('')}</select>
        <input type="number" id="exMin" inputmode="numeric" min="1" max="600" placeholder="min">
        <input type="number" id="exKcal" inputmode="numeric" min="0" max="5000" placeholder="kcal">
        <button class="btn" data-action="ex-add">Add</button>
      </div>
      <p class="faint small" style="margin:6px 0 0">Calories are worked out from your weight and time; type your own if your watch shows a number.</p>
    </div>`;
  }
  function wireWaterExercise(k) {
    const act = $('#exAct'), mins = $('#exMin'), kc = $('#exKcal'); if (!act) return;
    const est = () => { const met = (EXERCISES.find(x => x[0] === act.value) || [, 5])[1]; const mn = Number(mins.value); kc.placeholder = mn > 0 ? String(Math.round(met * (currentWeight() || 75) * mn / 60)) : 'kcal'; };
    act.addEventListener('change', est); mins.addEventListener('input', est);
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
  // Diary macro bar: the red line is the target. Going past it turns the extra green
  // for protein (good) and red for carbs and fat (too much).
  function macroBar(cls, val, target, overIsGood) {
    if (!target) return barHtml(cls, val, target);
    const scale = Math.max(target * 1.25, val * 1.04);
    const tPct = target / scale * 100, under = Math.min(val, target) / scale * 100, over = val > target ? (val - target) / scale * 100 : 0;
    return `<div class="bar mbar ${cls} ${over ? (overIsGood ? 'over-good' : 'over-bad') : ''}"><i style="width:${under}%"></i>${over ? `<b class="extra" style="left:${tPct}%;width:${over}%"></b>` : ''}<s class="goal" style="left:${tPct}%"></s></div>`;
  }
  const macroVal = (val, target, overIsGood) => {
    const d = Math.round(val - target);
    return `${fmt(val)} <span class="faint">/ ${fmt(target)} g</span>${target && d > 0 ? ` <span class="${overIsGood ? 'm-good' : 'm-bad'}">+${fmt(d)}</span>` : ''}`;
  };
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
      missingNote = `<div class="note">${worst} of ${count} logged item${count === 1 ? '' : 's'} ${worst === 1 ? 'has' : 'have'} no data for some vitamins or minerals, so those totals may be a little low. They're tagged <span class="vit-badge none">no vitamins</span> or <span class="vit-badge part">some vitamins</span> in your meals.</div>`;
    }
    return missingNote + MICRO_GROUPS.map(g => `<div class="micro-group"><h3>${g.name}</h3><div class="micro-list">${g.items.map(m => {
      const v = t[m.k] / divideBy, target = tg[m.k], pct = target ? v / target * 100 : 0;
      const cls = m.limit ? `limit ${pct > 100 ? 'high' : ''}` : (pct < 70 ? 'low' : '');
      const label = m.limit ? `${fmtSmart(v)} / max ${fmtSmart(target)} ${m.unit}` : `${fmtSmart(v)} / ${fmtSmart(target)} ${m.unit}`;
      return `<div class="micro ${cls}"><span class="mn">${m.name}</span><span class="mv">${label} <span class="faint">${fmt(pct)}%</span></span><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div></div>`;
    }).join('')}</div></div>`).join('');
  }

  function checkinCard() {
    const sg = P().targets.suggestion; if (!sg) return '';
    const row = (lab, m) => m ? `<div class="ck-row"><span>${lab}</span><span class="num">${fmt(m.kcal)} kcal · ${fmt(m.p)}P ${fmt(m.c)}C ${fmt(m.f)}F</span></div>` : '';
    return `<div class="panel checkin"><div class="ck-head">📊 <b>Weekly check-in</b><span class="faint small">${esc(shortDate(sg.at))}</span></div>
      <p>${esc(sg.reason)}</p>
      ${sg.info ? `<div class="ck-btns"><button class="btn primary" data-action="ck-ok">OK</button></div>` : `
      <div class="ck-cmp"><div><div class="faint small">Now</div>${row('Training', sg.from.train)}${row('Rest', sg.from.rest)}</div><div><div class="faint small">Suggested</div>${row('Training', sg.to.train)}${row('Rest', sg.to.rest)}</div></div>
      <div class="ck-btns"><button class="btn primary" data-action="ck-yes">Approve and update</button><button class="btn" data-action="ck-no">Keep as it is</button></div>`}
    </div>`;
  }
  function renderToday() {
    const k = UI.date, isToday = k === todayKey();
    const entries = dayEntries(k);
    if (isToday) weeklyCheck();
    const t = totalsOf(entries), tg = targets(k);
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
          <span class="ename">${esc(e.name)}${vitBadge(e)}</span>
          <span class="eg" title="${esc(fmtAmt(e.grams, unitOf(e)))}">${esc(entryAmount(e))}</span>
          <span class="ek">${fmt(e.n.kcal * e.grams / 100)}</span>
          <span class="emac"><span class="p">${fmt((e.n.p || 0) * e.grams / 100, 1)}P</span> · <span class="c">${fmt((e.n.c || 0) * e.grams / 100, 1)}C</span> · <span class="f">${fmt((e.n.f || 0) * e.grams / 100, 1)}F</span></span>
        </li>`).join('')}</ul>
        <div class="meal-tools">
          <button class="add-line" data-action="add" data-meal="${meal}">+ Add to ${meal.toLowerCase()}</button>
          <button class="tool-chip" data-action="quick-add" data-meal="${meal}">⚡ Quick add</button>
          ${(P().diary[addDays(k, -1)] || []).some(e => e.meal === meal) ? `<button class="tool-chip" data-action="copy-meal" data-meal="${meal}">↻ Copy yesterday</button>` : ''}
          ${list.length ? `<button class="tool-chip" data-action="fav-meal" data-meal="${meal}">★ Save as favourite</button>` : ''}
        </div>
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
      ${checkinCard()}
      ${gameCard(k)}
      ${splitOn() ? `<div class="daytype"><div class="seg"><button class="${dayType(k) === 'train' ? 'on' : ''}" data-action="daytype" data-v="train">🏋️ Training day</button><button class="${dayType(k) === 'rest' ? 'on' : ''}" data-action="daytype" data-v="rest">😴 Rest day</button></div><span class="faint small">${(P().dayMeta[k] || {}).dayType ? 'set for this day' : Array.isArray(P().targets.trainDays) && P().targets.trainDays.length ? 'from your weekly schedule' : 'tap to change'}</span></div>` : ''}
      ${!P().setupDone ? `<div class="nudge"><span><b>Set up ${esc(P().name)}'s details</b> so the calorie targets and weight projection fit ${esc(P().name)}: age, height, weight and goal.</span><button class="btn primary" data-action="go-settings">Set up</button></div>` : ''}
      <div class="readout">
        <div class="scale ${t.kcal > tg.kcal * 1.05 ? 'over' : ''}">
          <div class="scale-label"><span>EATEN</span><span>TARGET ${fmt(tg.kcal)}</span></div>
          <div class="scale-value">${fmt(t.kcal)}<small>kcal</small></div>
          <div class="scale-foot"><span>${remaining >= 0 ? `<b>${fmt(remaining)}</b> left` : `<b>${fmt(-remaining)}</b> over`}</span><span><b>${fmt(t.grams)}</b> g food${t.ml ? ` · <b>${fmtAmt(t.ml, 'ml').replace(/ (ml|L)$/, '</b> $1')} drinks` : ''}</span></div>
        </div>
        <div>
          <div class="macro-rows">
            <div class="mrow"><span class="mname" style="color:${C.pro}">Protein</span>${macroBar('pro', t.p, tg.p, true)}<span class="mval">${macroVal(t.p, tg.p, true)}</span></div>
            <div class="mrow"><span class="mname" style="color:${C.carb}">Carbs</span>${macroBar('carb', t.c, tg.c, false)}<span class="mval">${macroVal(t.c, tg.c, false)}</span></div>
            <div class="mrow"><span class="mname" style="color:${C.fat}">Fat</span>${macroBar('fat', t.f, tg.f, false)}<span class="mval">${macroVal(t.f, tg.f, false)}</span></div>
          </div>
          ${entries.length ? `<div class="plate" title="Where your calories came from"><i style="width:${t.p * 4 / kcalFromMacros * 100}%;background:${C.pro}"></i><i style="width:${t.c * 4 / kcalFromMacros * 100}%;background:${C.carb}"></i><i style="width:${t.f * 9 / kcalFromMacros * 100}%;background:${C.fat}"></i></div>
          <div class="plate-key"><span>Calories from</span><span><i class="sw" style="background:${C.pro}"></i>protein ${fmt(t.p * 4 / kcalFromMacros * 100)}%</span><span><i class="sw" style="background:${C.carb}"></i>carbs ${fmt(t.c * 4 / kcalFromMacros * 100)}%</span><span><i class="sw" style="background:${C.fat}"></i>fat ${fmt(t.f * 9 / kcalFromMacros * 100)}%</span></div>` : ''}
          ${gd ? `<div class="garmin-strip"><span>Garmin</span>
            ${gd.kcalTotal != null ? `<span><b>${fmt(gd.kcalTotal)}</b>kcal burned</span>` : ''}
            ${gd.kcalTotal != null && entries.length ? `<span><b>${fmt(t.kcal - gd.kcalTotal)}</b>net</span>` : ''}
            ${gd.steps != null ? `<span><b>${fmt(gd.steps)}</b>steps</span><span><b>${fmt(walkKcal(gd).kcal)}</b>kcal walking</span>` : ''}
            ${gd.sleepScore != null ? `<span><b>${fmt(gd.sleepScore)}</b>sleep score</span>` : ''}
            ${gd.restingHr != null ? `<span><b>${fmt(gd.restingHr)}</b>resting bpm</span>` : ''}</div>` : ''}
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="panel">
          ${entries.length ? mealsHtml : `<div class="empty-day"><h2>Nothing logged for ${isToday ? 'today' : 'this day'} yet</h2><p>Add what you ate in grams and what you drank in ml. Search the food list, pick from Sainsbury's, Aldi or Co-op products, or look up anything online.</p><button class="btn primary" data-action="add" data-meal="${isToday ? guessMeal() : 'Breakfast'}">Log food</button></div>
            ${MEALS.map(m => `<button class="add-line" style="margin-right:16px" data-action="add" data-meal="${m}">+ ${m}</button>`).join('')}
            <div class="meal-tools" style="margin-top:10px"><button class="tool-chip" data-action="quick-add" data-meal="${guessMeal()}">⚡ Quick add calories</button>${(P().diary[addDays(k, -1)] || []).length ? `<button class="tool-chip" data-action="copy-day">↻ Copy all of yesterday</button>` : ''}${(P().profile.favMeals || []).length ? `<button class="tool-chip" data-action="add" data-meal="${guessMeal()}" data-fav="1">★ Favourite meals</button>` : ''}</div>`}
          ${entries.length ? `<div class="day-actions">
            ${complete ? `<span class="complete-badge">Day marked complete</span><button class="btn ghost" data-action="toggle-complete">Undo</button>`
              : `<span class="muted small">Finished logging? Marking the day complete stops the reminder and counts it in Daily Performance.</span><button class="btn" data-action="toggle-complete">Mark day complete</button>`}
          </div>` : ''}
        </div>
        <div class="stack">
          ${weightCard(k)}
          ${photoCard(k)}
          ${waterExerciseCard(k)}
          <div class="panel vit-panel">
            <h2>Vitamins & minerals</h2>
            ${(() => { const w = dayLimitWarnings(entries); return w.length ? `<div class="limit-warn"><b>⚠ Above a safe upper limit</b>${w.map(x => `<p>${x}</p>`).join('')}<p class="faint small">Limits are EFSA adult safe upper levels. Check with a pharmacist or GP before taking high doses long-term.</p></div>` : ''; })()}
            ${entries.length ? microsHtml(t, 1, entries.length) : '<p class="muted">Your vitamins, minerals and fibre for the day show here once you log food.</p>'}
          </div>
        </div>
      </div>
    </div>`;
    wireWeight(k); wireWaterExercise(k); photoThumbs();

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
    else if (act === 'daytype') { const m = P().dayMeta[UI.date] || (P().dayMeta[UI.date] = {}); m.dayType = a.dataset.v; save(); render(); }
    else if (act === 'ck-ok' || act === 'ck-no') { P().targets.suggestion = null; save(); render(); toast(act === 'ck-no' ? 'Kept your current targets.' : 'Got it.'); }
    else if (act === 'ck-yes') { const T = P().targets, sg = T.suggestion; if (sg && sg.to) { Object.assign(T, { kcal: sg.to.train.kcal, p: sg.to.train.p, c: sg.to.train.c, f: sg.to.train.f }); if (sg.to.rest) T.rest = sg.to.rest; (T.history = T.history || []).push({ at: todayKey(), delta: sg.delta }); } T.suggestion = null; save(); render(); toast('Targets updated.'); }
    else if (act === 'g-renew') { G.connected = false; G.expired = true; G.checked = true; UI.device = 'garmin'; nav('garmin'); }
    else if (act === 'go-forecast') nav('forecast');
    else if (act === 'add') { openAdd({ meal: a.dataset.meal, date: UI.date }); if (a.dataset.fav) setTab('fav'); else if (a.dataset.meal === 'Supplements') setTab('sup'); }
    else if (act === 'quick-add') quickAdd(a.dataset.meal, UI.date);
    else if (act === 'water') {
      const m = P().dayMeta[UI.date] || (P().dayMeta[UI.date] = {});
      m.water = Math.max(0, (m.water || 0) + Number(a.dataset.ml)); save(); render();
    }
    else if (act === 'ex-add') {
      const name = $('#exAct').value, mn = Number($('#exMin').value);
      if (!(mn > 0)) { toast('Type how many minutes.'); return; }
      const met = (EXERCISES.find(x => x[0] === name) || [, 5])[1];
      const kc = Number($('#exKcal').value) > 0 ? Number($('#exKcal').value) : Math.round(met * (currentWeight() || 75) * mn / 60);
      const m = P().dayMeta[UI.date] || (P().dayMeta[UI.date] = {});
      m.ex = [...(m.ex || []), { id: uid(), name, min: mn, kcal: kc }]; save(); render();
      toast(`Logged ${name.toLowerCase()}: ${fmt(mn)} min, ${fmt(kc)} kcal.`);
    }
    else if (act === 'ex-del') { const m = P().dayMeta[UI.date] || {}; m.ex = (m.ex || []).filter(x => x.id !== a.dataset.id); save(); render(); }
    else if (act === 'copy-meal' || act === 'copy-day') {
      const from = (P().diary[addDays(UI.date, -1)] || []).filter(e => act === 'copy-day' || e.meal === a.dataset.meal);
      if (!from.length) return;
      const list = P().diary[UI.date] || (P().diary[UI.date] = []);
      const added = from.map(e => ({ ...JSON.parse(JSON.stringify(e)), id: uid(), at: Date.now() }));
      list.push(...added); save(); render();
      toast(`Copied ${added.length} item${added.length === 1 ? '' : 's'} from yesterday.`, 'Undo', () => { const ids = new Set(added.map(x => x.id)); P().diary[UI.date] = (P().diary[UI.date] || []).filter(x => !ids.has(x.id)); save(); render(); });
    }
    else if (act === 'fav-meal') {
      const list = dayEntries(UI.date).filter(e => e.meal === a.dataset.meal);
      if (!list.length) return;
      const nm = prompt('Name this favourite meal', `My ${a.dataset.meal.toLowerCase()}`);
      if (nm === null) return;
      const fav = { id: uid(), name: (nm.trim() || `My ${a.dataset.meal.toLowerCase()}`).slice(0, 50), items: list.map(e => { const c = JSON.parse(JSON.stringify(e)); delete c.id; delete c.at; delete c.meal; return c; }) };
      P().profile.favMeals = [fav, ...(P().profile.favMeals || [])].slice(0, 30);
      save(); toast(`Saved "${fav.name}". Find it under Favourites when you log food.`);
    }
    else if (act === 'edit-entry') {
      const en = dayEntries(UI.date).find(x => x.id === a.dataset.id);
      if (en) openAdd({ date: UI.date, entry: en });
    }
    else if (['go-ranked', 'go-photos', 'rk-tab', 'gg-result', 'gg-claim-week', 'gg-claim-event', 'gg-equip', 'gg-hidew', 'gg-avatar-remove', 'gg-avatar-file', 'react', 'photo-take', 'photo-view', 'photos-make', 'photos-share'].includes(act)) ggAction(act, a, e);
    else if (act === 'toggle-complete') {
      const m = P().dayMeta[UI.date] || {};
      m.complete = !m.complete;
      P().dayMeta[UI.date] = m;
      save(); render();
      if (m.complete) { game().invalidate(); showResult(UI.date); }
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
            <div class="seg" id="mtabs"><button data-tab="all" class="on">Food list</button><button data-tab="recent">Recent</button><button data-tab="fav">★ Favourites</button><button data-tab="sup">💊 Supplements</button><button data-tab="shop">Shops</button><button data-tab="online">Search online</button></div>
            <div class="maker-row"><button class="juice-btn" data-m="juice"><span class="jb-ico">🥤</span><span><b>Juice or smoothie</b><small>Liquid, fruit and extras you blended</small></span></button><button class="juice-btn" data-m="soup"><span class="jb-ico">🍲</span><span><b>Soup</b><small>What went in the pot, then how much you had</small></span></button><button class="juice-btn" data-m="bowl"><span class="jb-ico">🥣</span><span><b>Yoghurt bowl</b><small>Your yoghurt plus fruit, nuts, protein and toppings</small></span></button></div>
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
      if ((M.tab === 'recent' || M.tab === 'fav') && M.q) setTab('all'); else if (M.tab === 'sup') renderResults();
      else if (M.tab === 'shop') { clearTimeout(M.shopTimer); const t = M.q.trim(); if (M.shop === 'ryanair') runShop(1); else if (!t || t.length >= 3) M.shopTimer = setTimeout(() => runShop(1), 1200); }
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

  const SHOP_LIST = [['sainsburys', "Sainsbury's"], ['aldi', 'Aldi'], ['coop', 'Co-op'], ['ryanair', 'Ryanair ✈']];
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
    if (shop === 'ryanair') { // built in: works on the plane with no internet
      const all = BUILTIN.filter(f => f.cat === 'Ryanair');
      M.shopRes = q ? searchFoods(q, all) : all; M.shopErr = []; M.shopBusy = false; M.shopMore = false; M.shopKey = key;
      renderResults(); return;
    }
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

  // "per capsule: Vitamin D 25 µg · Omega-3 300 mg"
  // Safe daily upper limits for adults (EFSA 2024). supOnly: the limit is for supplements/added forms,
  // not what's naturally in food (folic acid, magnesium salts, preformed vitamin A).
  const UL = {
    b6: { lim: 12, u: 'mg', name: 'Vitamin B6' }, fol: { lim: 1000, u: 'µg', name: 'Folic acid', supOnly: true },
    vd: { lim: 100, u: 'µg', name: 'Vitamin D' }, ve: { lim: 300, u: 'mg', name: 'Vitamin E' },
    mg: { lim: 250, u: 'mg', name: 'Magnesium (supplements)', supOnly: true }, zn: { lim: 25, u: 'mg', name: 'Zinc' },
    fe: { lim: 40, u: 'mg', name: 'Iron', note: 'safe level' }, cu: { lim: 5, u: 'mg', name: 'Copper' },
    se: { lim: 255, u: 'µg', name: 'Selenium' }, io: { lim: 600, u: 'µg', name: 'Iodine' },
    ca: { lim: 2500, u: 'mg', name: 'Calcium' }, va: { lim: 3000, u: 'µg', name: 'Vitamin A (retinol)', supOnly: true }
  };
  const isSupEntry = e => /^sup\d/.test(String(e.foodId || '')) || e.meal === 'Supplements';
  // Warnings for a supplement at an amount (grams of product).
  function supWarnings(f, g) {
    if (!f || f.cat !== 'Supplements') return [];
    const out = [];
    for (const [k, L] of Object.entries(UL)) {
      const v = (f.n[k] || 0) * g / 100;
      if (v > L.lim) out.push(`${L.name}: ${fmtSmart(v)} ${L.u} is above the ${L.note || 'safe daily upper limit'} of ${fmtSmart(L.lim)} ${L.u}.`);
    }
    const nm = f.name.toLowerCase();
    if (/niacin\b.*flush|nicotinic/.test(nm)) out.push('Nicotinic acid (flush niacin): the safe daily limit is 10 mg. High doses can harm the liver, so take only on medical advice.');
    if (/beta-carotene/.test(nm)) out.push('Smokers and ex-smokers should not take beta-carotene supplements.');
    if (/vitamin a \(retinol\)|cod liver oil/.test(nm)) out.push('If you are pregnant or trying to be, avoid vitamin A (retinol) and cod liver oil supplements.');
    if (/prescription|ferrous|5 mg/.test(nm) && /folic|ferrous/.test(nm)) out.push('This is a prescription-strength dose. Take it only as advised by your doctor or pharmacist.');
    if (/melatonin/.test(nm)) out.push('Melatonin is prescription-only in the UK.');
    if (/manganese/.test(nm)) out.push('Manganese: the safe intake is about 8 mg a day in total, including food.');
    if (/caffeine/.test(nm)) out.push('Keep caffeine under about 400 mg a day in total, including coffee and energy drinks.');
    return out;
  }
  // Day totals above a safe upper limit.
  function dayLimitWarnings(entries) {
    const all = totalsOf(entries), sup = totalsOf(entries.filter(isSupEntry));
    const out = [];
    for (const [k, L] of Object.entries(UL)) {
      const v = (L.supOnly ? sup[k] : all[k]) || 0;
      if (v > L.lim) out.push(`<b>${L.name}</b> ${fmtSmart(v)} ${L.u} today${L.supOnly ? ' from supplements' : ''}: above the ${L.note || 'safe daily upper limit'} of ${fmtSmart(L.lim)} ${L.u}.`);
    }
    return out;
  }
  function supSummary(f) {
    const parts = NKEYS.filter(k => !['kcal', 'p', 'c', 'f', 'sat', 'sug', 'na', 'fib'].includes(k) && f.n[k] > 0).map(k => `${N_LABEL[k][0].replace('Omega-3 EPA + DHA', 'Omega-3')} ${fmtSmart(f.n[k] * f.each.g / 100)} ${N_LABEL[k][1]}`);
    return `per ${esc(f.each.one)}: ` + (parts.slice(0, 4).join(' · ') || 'no vitamins or minerals');
  }
  function resultRow(f) {
    const n = f.n;
    const sel = M.sel && M.sel.id === f.id;
    const u = unitOf(f);
    const meta = f.source === 'Built-in' ? (f.cat || '') : f.source === 'Mine' ? 'My food' : f.source;
    return `<div class="result ${sel ? 'sel' : ''}" tabindex="0" data-m="pick" data-id="${esc(f.id)}">
      <span class="rn">${esc(f.name)}</span><span class="rk">${fmt(f.cat === 'Supplements' && f.each ? n.kcal * f.each.g / 100 : n.kcal)} kcal</span>
      ${f.cat === 'Supplements' ? '' : `<span class="rm">${esc(meta)}${f.size ? ' · pack ' + esc(f.size) : ''}${f.portionLabel && f.portion ? ' · ' + esc(f.portionLabel) + ' ≈ ' + fmtAmt(f.portion, u) : ''}</span>`}
      ${f.cat === 'Supplements' && f.each ? `<span class="rm-sup">${supSummary(f)}${Object.entries(UL).some(([k, L]) => (f.n[k] || 0) * f.each.g / 100 > L.lim) || /flush|manganese/i.test(f.name) ? ' <span class="hi-dose">⚠ high dose</span>' : ''}</span>` : `<span class="rm2">per 100 ${u} · ${fmt(n.p, 1)}P ${fmt(n.c, 1)}C ${fmt(n.f, 1)}F</span>`}</div>`;
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
    } else if (M.tab === 'sup') {
      const all = BUILTIN.filter(f => f.cat === 'Supplements');
      let list = M.q.trim() ? searchFoods(M.q, all) : all;
      if (!M.q.trim() && M.supHint) { // a scanned supplement: closest matches first
        const words = M.supHint.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        const score = f => words.filter(w => f.name.toLowerCase().includes(w)).length;
        list = [...all].sort((a, b) => score(b) - score(a));
      }
      lastList = list;
      html = `<div class="group-label">${M.supHint && !M.q.trim() ? `Closest to “${esc(M.supHint)}” first` : 'Supplements · logged per capsule, tablet or scoop'}</div>` + (list.length ? list.map(resultRow).join('') : `<div class="hint">No supplement matches “${esc(M.q)}”.</div>`) + `<div class="hint faint small">Typical amounts per unit. If your product's label is very different, create it in Food list › Create a food.</div>`;
    } else if (M.tab === 'fav') {
      const favs = P().profile.favMeals || [];
      html = `<div class="hint" style="padding-bottom:4px"><button class="btn" data-m="quick">⚡ Quick add calories</button></div>` + (favs.length ? `<div class="group-label">Favourite meals · tap to add to ${esc(M.meal.toLowerCase())}</div>` + favs.map(f => {
        const kc = f.items.reduce((a, e) => a + (e.n.kcal || 0) * e.grams / 100, 0);
        return `<div class="result fav-row" data-m="fav-log" data-id="${esc(f.id)}"><span class="rn">★ ${esc(f.name)}</span><span class="rk">${fmt(kc)} kcal</span><span class="rm">${esc(f.items.map(e => e.name).join(', ').slice(0, 90))}</span><button class="btn ghost fav-x" data-m="fav-del" data-id="${esc(f.id)}" aria-label="Remove favourite">✕</button></div>`;
      }).join('') : `<div class="hint">No favourite meals yet. In your diary, tap <b>★ Save as favourite</b> under a meal to save it here for one-tap logging.</div>`);
    } else if (M.tab === 'shop') {
      const nm = esc(shopName(M.shop));
      lastList = M.shopRes || [];
      if (M.shopBusy && !M.shopRes) html = `<div class="hint">Loading ${nm} products…</div>`;
      else {
        html = (M.shopErr.length ? `<div class="hint err">${M.shopErr.map(esc).join('<br>')}</div>` : '') +
          (lastList.length ? `<div class="group-label">${M.q.trim() ? `${nm} products matching “${esc(M.q.trim())}”` : `Popular ${nm} products · type to search`}</div>` + lastList.map(resultRow).join('')
            + (M.shopMore ? `<div class="hint"><button class="btn" data-m="shop-more" ${M.shopBusy ? 'disabled' : ''}>${M.shopBusy ? 'Loading…' : 'Show more'}</button></div>` : '')
            : (M.shopErr.length ? '' : `<div class="hint">No ${nm} products found${M.q.trim() ? ` for “${esc(M.q.trim())}”` : ''}. Try another word, or use <b>Search online</b>.</div>`));
        html += M.shop === 'ryanair' ? `<div class="hint faint small">Ryanair's onboard menu works offline, so you can log it on the plane. Ryanair doesn't publish nutrition, so these are typical values for each item.</div>` : `<div class="hint faint small">Products come from Open Food Facts, where shoppers add products from these shops. It isn't the shops' own list, so some products are missing.</div>`;
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
      <div class="muted small">${esc(f.source === 'Built-in' ? 'Food list' : f.source === 'Mine' ? 'My food' : f.source)} · ${f.cat === 'Supplements' && f.each ? `per ${esc(f.each.one)}: ${fmt(n.kcal * f.each.g / 100)} kcal` : `${fmt(n.kcal)} kcal per 100 ${u}`}${f.size ? ' · pack ' + esc(f.size) : ''}</div>
      <div class="amount-q">How much did you have?</div>
      ${counting ? `<div class="grams-in"><input type="number" id="mg" min="0" step="0.5" value="${M.count}" aria-label="How many ${esc(f.each.many)}"><span>${esc(Number(M.count) > 0 && Number(M.count) <= 1 ? f.each.one : f.each.many)}</span></div>
      ${f.cat === 'Supplements' ? '' : `<div class="muted small" style="margin:-4px 0 10px">${fmtAmt(g, u)} · 1 ${esc(f.each.one)} ≈ ${fmtAmt(f.each.g, u)} · <a href="#" data-m="mode" data-mode="grams">enter ${u === 'ml' ? 'ml' : 'grams'} instead</a></div>`}
      <div class="chips">${[0.5, 1, 2, 3, 4, 6].map(c => `<button class="chip" data-m="count" data-c="${c}">${esc(countLabel(c, f.each))}</button>`).join('')}</div>`
      : `<div class="grams-in"><input type="number" id="mg" min="0" step="1" value="${g}" aria-label="${u === 'ml' ? 'Millilitres' : 'Grams'}"><span>${u}</span></div>
      ${u === 'ml' && g >= 1000 ? `<div class="muted small" style="margin:-4px 0 8px">= ${fmtAmt(g, 'ml')}</div>` : ''}
      ${f.each ? `<div class="muted small" style="margin:-4px 0 10px"><a href="#" data-m="mode" data-mode="count">count ${esc(f.each.many)} instead</a></div>` : ''}
      <div class="chips">${chips.map(([v, l]) => `<button class="chip" data-m="grams" data-g="${v}">${esc(l)}</button>`).join('')}</div>`}
      <div class="sup-warn">${supWarnings(f, g).map(w => `<p>⚠ ${esc(w)}</p>`).join('')}</div>
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
    const linked = (P().profile.barcodeLinks || {})[code]; // barcodes the person linked to a food or supplement before
    if (!food && linked) food = allFoods().find(x => x.id === linked) || null;
    if (!food) {
      toast('Looking up ' + code + '…');
      try { food = await social.lookupBarcode(code); } catch (e) { toast('Could not reach Open Food Facts. Check your internet, or add the product yourself.'); }
      if (food && food.supplement) {
        if (!M) openAdd(ctx);
        M.supHint = food.name; M.meal = 'Supplements'; setTab('sup');
        toast(`${food.name || 'This'} is a supplement. Pick the closest one: it's logged per capsule or tablet.`);
        return;
      }
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
    notFoundChooser(code, ctx);
  }
  // Barcode not in Open Food Facts: link it once to a supplement or food, or enter it from the label.
  function notFoundChooser(code, ctx) {
    M = null; J = null;
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>Not found</h2><button class="btn ghost" data-nf="close">Close</button></div>
      <div class="modal-body">
        <p style="margin-top:0">Barcode <b class="num">${esc(code)}</b> isn't in the online product database yet (common for Aldi and Lidl own brands). Tell the app what it is once, and next time it scans straight away.</p>
        <div class="nf-opts">
          <button class="juice-btn" data-nf="sup"><span class="jb-ico">💊</span><span><b>It's a supplement</b><small>Pick the closest capsule, tablet or scoop</small></span></button>
          <button class="juice-btn" data-nf="list"><span class="jb-ico">🔎</span><span><b>Pick it from the food list</b><small>Search the foods already in the app</small></span></button>
          <button class="juice-btn" data-nf="label"><span class="jb-ico">🏷️</span><span><b>Enter it from the label</b><small>Type the nutrition per 100 g</small></span></button>
        </div>
      </div>`;
    card.onclick = e => {
      const b = e.target.closest('[data-nf]'); if (!b) return;
      const a = b.dataset.nf;
      if (a === 'close') { closeModal(); return; }
      if (a === 'label') { closeModal(); foodForm(null, { barcode: code, then: (f) => openAdd({ ...ctx, food: f }) }); return; }
      openAdd(a === 'sup' ? { ...ctx, meal: 'Supplements' } : ctx);
      M.linkCode = code;
      setTab(a === 'sup' ? 'sup' : 'all');
      toast(a === 'sup' ? 'Pick the closest supplement. This barcode will go straight to it next time.' : 'Search and pick the food. This barcode will go straight to it next time.');
    };
    modal.hidden = false;
  }
  window.MHScanIntoLog = () => { closeModal(); openAdd({ date: UI.view === 'today' ? UI.date : todayKey(), meal: guessMeal() }); scanIntoModal(); };

  // ---------------------------------------------------------------- juice / smoothie builder
  const JUICE_SETS = [
    ['Liquid', 'What did you blend it with?', ['Water', 'Milk, semi-skimmed', 'Milk, whole', 'Milk, skimmed', 'Almond milk, unsweetened', 'Oat milk', 'Soya milk, unsweetened', 'Coconut milk drink', 'Coconut water', 'Orange juice', 'Apple juice', 'Kefir, plain']],
    ['Fruit & veg', 'Fresh or frozen', ['Banana', 'Strawberries', 'Blueberries', 'Raspberries', 'Frozen mixed berries', 'Mango', 'Pineapple', 'Apple', 'Orange', 'Kiwi', 'Pear', 'Avocado', 'Dates, medjool', 'Spinach, raw', 'Kale, raw', 'Carrot, raw', 'Cucumber', 'Celery', 'Beetroot, cooked', 'Ginger, fresh', 'Lemon juice, fresh', 'Lime juice, fresh', 'Mint leaves, fresh']],
    ['Extras', 'Nuts, seeds, protein, sweeteners', ['Oats, rolled (dry)', 'Peanut butter', 'Almonds', 'Walnuts', 'Cashews', 'Chia seeds', 'Flaxseed, ground', 'Honey', 'Maple syrup', 'Whey protein powder (typical)', 'Greek yogurt, 0% fat', 'Skyr, plain', 'Cocoa powder, unsweetened', 'Cinnamon, ground', 'Ice cubes']]
  ];
  const SOUP_SETS = [
    ['Liquid', 'What the soup is made with', ['Water', 'Chicken stock', 'Vegetable stock', 'Beef stock', 'Milk, semi-skimmed', 'Coconut milk (tinned)', 'Double cream']],
    ['Vegetables', 'Raw weight going into the pot', ['Onion', 'Garlic', 'Carrot, raw', 'Celery', 'Leek', 'Potato, raw', 'Sweet potato, raw', 'Turnip', 'Swede', 'Parsnip', 'Celeriac', 'Butternut squash', 'Pumpkin', 'Tomato', 'Chopped tomatoes (tin)', 'Tomato purée', 'Spinach, raw', 'Kale, raw', 'Broccoli, raw', 'Cauliflower', 'Courgette', 'Red pepper', 'Mushrooms', 'Cabbage', 'Okra', 'Fennel', 'Chilli, fresh', 'Peas, boiled', 'Sweetcorn', 'Fresh coriander', 'Fresh parsley']],
    ['Protein', 'Meat, fish, lentils and beans', ['Chicken breast, raw', 'Chicken thigh, skinless, raw', 'Diced beef, raw', 'Beef mince 5% fat, raw', 'Lamb mince, raw', 'Red lentils, dry', 'Chickpeas, canned (drained)', 'Kidney beans, canned (drained)', 'Cod, cooked', 'Prawns, cooked', 'Egg, whole (raw)']],
    ['Extras', 'Oil, pasta, rice, thickeners, seasoning', ['Olive oil', 'Butter', 'Vermicelli, dry', 'Pasta, dry', 'White / basmati rice, uncooked', 'Pearl barley, dry', 'Plain flour', 'Parmesan', 'Harissa paste', 'Ground cumin', 'Stock cube', 'Salt']]
  ];
  const YOG_SETS = [
    ['Yoghurt', 'The base of your bowl', ['Greek yogurt, 0% fat', 'Greek-style yogurt, full fat', 'Natural yogurt, whole milk', 'Skyr, plain', 'High-protein yogurt, plain (typical)', 'Quark, plain fat-free', 'Kefir, plain', 'Fruit yogurt', 'Soya yogurt, plain (fortified)', 'Coconut yogurt alternative, plain']],
    ['Fruit', 'Fresh, frozen or dried', ['Banana', 'Strawberries', 'Blueberries', 'Raspberries', 'Blackberries', 'Frozen mixed berries', 'Mango', 'Kiwi', 'Apple', 'Peach / nectarine', 'Cherries', 'Pomegranate seeds', 'Grapes', 'Passion fruit', 'Figs, fresh', 'Dates, medjool', 'Raisins', 'Dried apricots', 'Goji berries, dried']],
    ['Crunch', 'Granola, oats, nuts and seeds', ['Granola', 'Muesli', 'Oats, rolled (dry)', 'Almonds', 'Walnuts', 'Cashews', 'Pistachios', 'Hazelnuts', 'Pecans', 'Brazil nuts', 'Mixed nuts', 'Chia seeds', 'Flaxseed, ground', 'Pumpkin seeds', 'Sunflower seeds', 'Hemp seeds, hulled', 'Desiccated coconut', 'Cacao nibs', 'Dark chocolate (70-85%)']],
    ['Protein & toppings', 'Powder, nut butter and drizzles', ['Whey protein powder (typical)', 'Peanut butter', 'Almond butter', 'Chocolate hazelnut spread', 'Honey', 'Maple syrup', 'Jam', 'Cocoa powder, unsweetened', 'Cinnamon, ground']]
  ];
  const BOWL_ML = 500;
  const foodByName = nm => BUILTIN.find(f => f.name === nm) || null;
  let J = null;
  const isSoup = () => J && J.kind === 'soup';
  const isYog = () => J && J.kind === 'bowl';
  const builderSets = () => isSoup() ? SOUP_SETS : isYog() ? YOG_SETS : JUICE_SETS;
  // Soup: the whole pot's nutrition is shared out per ml of finished soup.
  function soupPot() { const raw = juiceTotals().g; return Number(J.potMl) > 0 ? Number(J.potMl) : Math.round(raw); }
  function soupPortion() { return Number(J.portionMl) > 0 ? Number(J.portionMl) : 0; }
  function juiceDefault(f, setIdx) {
    if (isSoup()) {
      if (setIdx === 0) return unitOf(f) === 'ml' && !/milk|cream/i.test(f.name) ? 1000 : 200;
      if (f.each) return f.each.g;
      if (setIdx === 2) return /lentil|barley/i.test(f.name) ? 150 : 250;
      return f.portion ? Math.round(f.portion) : 100;
    }
    if (isYog()) {
      if (setIdx === 0) return 200;
      if (setIdx === 1) return f.each && f.each.g <= 150 ? f.each.g : 80;
      if (/protein powder/i.test(f.name)) return 30;
      return Math.min(f.portion || 15, setIdx === 3 ? 15 : 30);
    }
    if (setIdx === 0) return f.name === 'Water' || unitOf(f) === 'ml' ? 250 : 200;
    if (f.each) return f.each.g;
    return f.portion ? Math.round(f.portion) : (setIdx === 2 ? 20 : 80);
  }
  function openJuice(ctx, editFood, kind) {
    M = null; // leave the normal log-food screen
    J = { kind: (editFood && editFood.recipeKind) || kind || 'juice', date: ctx.date, meal: ctx.meal || guessMeal(), name: '', items: [], q: '', saveRecipe: true, editId: null, potMl: P().profile.soupPotMl || 3 * BOWL_ML, portionMl: BOWL_ML };
    if (editFood && editFood.recipe) {
      const foods = allFoods();
      J.editId = editFood.id; J.name = editFood.name; J.potMl = editFood.potMl || '';
      J.items = editFood.recipe.map(r => { const food = foods.find(f => f.id === r.id); if (!food) return null; const ea = food.each, q = ea ? r.g / ea.g : 0;
        return ea && Math.abs(q * 2 - Math.round(q * 2)) < 1e-6 ? { food, g: r.g, mode: 'n', n: q } : { food, g: r.g, mode: 'g' }; }).filter(Boolean);
    }
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
    if (isYog()) {
      const top = J.items.filter(i => !/yogurt|yoghurt|skyr|quark|kefir|honey|syrup|cinnamon/i.test(i.food.name)).map(i => i.food.name.split(/[,(]/)[0].trim().toLowerCase());
      return top.length ? 'Yoghurt bowl: ' + top.slice(0, 3).join(', ') + (top.length > 3 ? ' +' + (top.length - 3) : '') : 'Yoghurt bowl';
    }
    if (isSoup()) {
      const main = J.items.filter(i => !/^(Water|Milk|Coconut milk|Double cream|Olive oil|Butter|Salt|Ground cumin|Stock|.* stock|Fresh |Harissa|Plain flour|Tomato purée|Garlic|Onion)/.test(i.food.name)).map(i => i.food.name.split(/[,(]/)[0].replace(/ dry$/, '').trim().toLowerCase());
      return main.length ? 'Soup: ' + main.slice(0, 3).join(', ') + (main.length > 3 ? ' +' + (main.length - 3) : '') : 'Soup';
    }
    return fr.length ? 'Smoothie: ' + fr.slice(0, 3).join(', ') + (fr.length > 3 ? ' +' + (fr.length - 3) : '') : 'Juice';
  }
  // Soup: what the bowl you had contains.
  function soupBox() {
    const { tot, g } = juiceTotals();
    const pot = soupPot(), por = soupPortion(), share = pot > 0 ? por / pot : 0;
    const x = k => (tot[k] || 0) * share;
    return `<div class="pk num">${fmt(x('kcal'))}<small>kcal in ${fmtAmt(por, 'ml')}</small></div>
      <div class="pmac"><div class="p"><b>${fmt(x('p'), 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(x('c'), 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(x('f'), 1)} g</b><span>Fat</span></div></div>
      <div class="muted small" style="margin-top:6px">Whole pot: ${fmt(tot.kcal || 0)} kcal in ${fmtAmt(pot, 'ml')} · ${pot > 0 ? fmt((tot.kcal || 0) / pot * BOWL_ML) : 0} kcal per bowl (500 ml)</div>`;
  }
  function renderJuice(keepFocus) {
    const { tot, g } = juiceTotals();
    const have = new Set(J.items.map(i => i.food.id));
    const results = J.q.trim() ? searchFoods(J.q).slice(0, 8) : [];
    const rows = J.items.map((it, i) => {
      const u = unitOf(it.food), ea = it.food.each, cnt = ea && it.mode === 'n';
      const hint = ea && Number(it.g) > 0 ? ` <span class="faint">${cnt ? '≈ ' + esc(fmtAmt(Number(it.g), u)) : '≈ ' + esc(countLabel(Math.round(Number(it.g) / ea.g * 4) / 4, ea))}</span>` : '';
      return `<div class="j-row"><span class="j-name">${esc(it.food.name)}${hint}<small>${fmt((it.food.n.kcal || 0) * (Number(it.g) || 0) / 100)} kcal</small></span>
        <span class="j-amt"><input type="number" inputmode="decimal" min="0" step="${cnt ? '0.5' : '1'}" value="${esc(cnt ? it.n : it.g)}" data-ji="${i}" aria-label="Amount of ${esc(it.food.name)}">${ea ? `<span class="j-unit"><button class="${cnt ? 'on' : ''}" data-j="mode" data-i="${i}" data-mode="n">${esc(Number(it.n) === 1 ? ea.one : ea.many)}</button><button class="${cnt ? '' : 'on'}" data-j="mode" data-i="${i}" data-mode="g">${u}</button></span>` : `<span>${u}</span>`}</span>
        <button class="btn ghost j-x" data-j="del" data-i="${i}" aria-label="Remove ${esc(it.food.name)}">✕</button></div>`;
    }).join('');
    const soup = isSoup(), yog = isYog();
    card.innerHTML = `<div class="modal-head"><h2>${soup ? (J.editId ? 'Edit saved soup' : 'Soup') : yog ? (J.editId ? 'Edit saved yoghurt bowl' : 'Yoghurt bowl') : (J.editId ? 'Edit saved juice' : 'Juice or smoothie')}</h2><button class="btn ghost" data-j="close">Close</button></div>
      <div class="modal-body">
        <p class="muted small" style="margin-top:0">${soup ? 'Add everything that went into the pot (raw weights), then say how much you had. A bowl is 500 ml.' : yog ? 'Pick your yoghurt, then everything you put in or on top. Set how much of each, in grams or by count.' : 'Tap what went in, then set how much of each. Grams for solids, ml for liquids.'}</p>
        ${builderSets().map(([title, sub, names], si) => `<div class="j-set"><div class="j-set-h"><b>${title}</b> <span class="faint small">${sub}</span></div><div class="chips">${names.map(foodByName).filter(Boolean).map(f => `<button class="chip ${have.has(f.id) ? 'on' : ''}" data-j="add" data-id="${esc(f.id)}" data-s="${si}">${have.has(f.id) ? '✓ ' : '+ '}${esc(f.name.replace(/, (unsweetened|fresh|raw|plain|ground|medjool|rolled \(dry\)|cooked)$/, '').replace(' (typical)', ''))}</button>`).join('')}</div></div>`).join('')}
        <div class="j-set"><div class="j-set-h"><b>Something else?</b> <span class="faint small">Search your food list</span></div>
          <input type="text" id="jq" placeholder="${soup ? 'e.g. chicken thigh, lentils, noodles' : yog ? 'e.g. protein granola, peanuts, coconut' : 'e.g. peanut butter, mango, protein'}" value="${esc(J.q)}" autocomplete="off">
          ${results.length ? `<div class="chips" style="margin-top:8px">${results.map(f => `<button class="chip ${have.has(f.id) ? 'on' : ''}" data-j="add" data-id="${esc(f.id)}" data-s="1">${have.has(f.id) ? '✓ ' : '+ '}${esc(f.name)}</button>`).join('')}</div>` : J.q.trim() ? '<p class="faint small">No match in the food list.</p>' : ''}
        </div>
        <div class="j-list">${rows || '<p class="muted small">Nothing added yet.</p>'}</div>
        ${soup ? `<div class="j-set"><div class="j-set-h"><b>How many bowls does the whole pot make?</b> <span class="faint small">the app remembers your usual</span></div>
          <div class="chips">${[2, 3, 4, 5, 6, 8].map(b => `<button class="chip ${Number(J.potMl) === b * BOWL_ML ? 'on' : ''}" data-j="pot" data-b="${b}">${b} bowls</button>`).join('')}</div>
          <div class="j-amt" style="margin-top:8px"><input type="number" id="spot" inputmode="numeric" min="0" step="50" value="${esc(J.potMl)}" placeholder="${fmt(Math.round(g))}" style="width:110px"><span>ml</span></div></div>
          <div class="j-set"><div class="j-set-h"><b>How much did you have?</b></div>
          <div class="chips">${[0.5, 1, 1.5, 2].map(b => `<button class="chip ${Number(J.portionMl) === b * BOWL_ML ? 'on' : ''}" data-j="bowl" data-b="${b}">${b === 0.5 ? '½ bowl' : b === 1 ? '1 bowl' : b === 1.5 ? '1½ bowls' : '2 bowls'}</button>`).join('')}</div>
          <div class="j-amt" style="margin-top:8px"><input type="number" id="sml" inputmode="numeric" min="0" step="50" value="${esc(J.portionMl)}" style="width:110px"><span>ml</span></div></div>` : ''}
        <div class="preview j-total">${soup ? soupBox() : `
          <div class="pk num">${fmt(tot.kcal || 0)}<small>kcal</small></div>
          <div class="pmac"><div class="p"><b>${fmt(tot.p || 0, 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(tot.c || 0, 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(tot.f || 0, 1)} g</b><span>Fat</span></div></div>
          <div class="muted small" style="margin-top:6px">${fmt(g)} ${J.items.some(i => unitOf(i.food) === 'ml') ? 'ml/g' : 'g'} in total · fibre ${fmt(tot.fib || 0, 1)} g · sugar ${fmt(tot.sug || 0, 1)} g${tot.vc != null ? ` · vitamin C ${fmt(tot.vc, 0)} mg` : ''}</div>`}
        </div>
        <label class="field" style="margin-top:14px"><span>Name</span><input type="text" id="jname" maxlength="60" placeholder="${esc(juiceName())}" value="${esc(J.name)}"></label>
        <label class="field" style="margin-top:10px"><span>Meal</span><select id="jmeal">${MEALS.map(m => `<option ${m === J.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        ${J.editId ? '' : `<label class="check" style="margin-top:12px"><input type="checkbox" id="jsave" ${J.saveRecipe ? 'checked' : ''}> Save it in My foods so I can log it again in one tap</label>`}
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">${J.editId ? `<button class="btn primary" data-j="update" ${J.items.length && g > 0 ? '' : 'disabled'}>Save changes</button><button class="btn" data-j="update-log" ${J.items.length && g > 0 ? '' : 'disabled'}>Save and add to ${esc(J.meal.toLowerCase())}</button>` : `<button class="btn primary" data-j="commit" ${J.items.length && g > 0 ? '' : 'disabled'}>Add to ${esc(J.meal.toLowerCase())}</button>`}</div>
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
    card.querySelectorAll('[data-ji]').forEach(inp => inp.addEventListener('input', () => {
      const it = J.items[Number(inp.dataset.ji)];
      if (it.food.each && it.mode === 'n') { it.n = inp.value; it.g = Math.round((Number(inp.value) || 0) * it.food.each.g * 10) / 10; } else it.g = inp.value;
      refreshJuiceTotals();
    }));
    $('#jname').addEventListener('input', e => { J.name = e.target.value; });
    const sp = $('#spot'); if (sp) sp.addEventListener('input', () => { J.potMl = sp.value; card.querySelectorAll('[data-j="pot"]').forEach(b => b.classList.toggle('on', Number(b.dataset.b) * BOWL_ML === Number(sp.value))); refreshJuiceTotals(); });
    const sm = $('#sml'); if (sm) sm.addEventListener('input', () => { J.portionMl = sm.value; card.querySelectorAll('[data-j="bowl"]').forEach(b => b.classList.toggle('on', Number(b.dataset.b) * BOWL_ML === Number(sm.value))); refreshJuiceTotals(); });
    $('#jmeal').addEventListener('change', e => { J.meal = e.target.value; const b = card.querySelector('[data-j="commit"]'); if (b) b.textContent = 'Add to ' + J.meal.toLowerCase(); });
    const js = $('#jsave'); if (js) js.addEventListener('change', e => { J.saveRecipe = e.target.checked; });
    if (keepFocus) { const el = card.querySelector(keepFocus); if (el) { el.focus(); try { el.select(); } catch (_) {} } }
  }
  // Update the totals and per-item kcal without rebuilding the amount boxes.
  function refreshJuiceTotals() {
    const { tot, g } = juiceTotals();
    card.querySelectorAll('.j-row').forEach((row, i) => {
      const it = J.items[i]; if (!it) return;
      const sm = row.querySelector('.j-name small'); if (sm) sm.textContent = fmt((it.food.n.kcal || 0) * (Number(it.g) || 0) / 100) + ' kcal';
      const ea = it.food.each, fa = row.querySelector('.j-name .faint');
      if (ea && fa) fa.textContent = it.mode === 'n' ? '≈ ' + fmtAmt(Number(it.g) || 0, unitOf(it.food)) : '≈ ' + countLabel(Math.round((Number(it.g) || 0) / ea.g * 4) / 4, ea);
      const ub = row.querySelector('[data-mode="n"]'); if (ea && ub) ub.textContent = Number(it.n) === 1 ? ea.one : ea.many;
    });
    const box = card.querySelector('.j-total');
    const sp = $('#spot'); if (sp) sp.placeholder = fmt(Math.round(g));
    if (box && isSoup()) box.innerHTML = soupBox();
    else if (box) box.innerHTML = `<div class="pk num">${fmt(tot.kcal || 0)}<small>kcal</small></div>
      <div class="pmac"><div class="p"><b>${fmt(tot.p || 0, 1)} g</b><span>Protein</span></div><div class="c"><b>${fmt(tot.c || 0, 1)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(tot.f || 0, 1)} g</b><span>Fat</span></div></div>
      <div class="muted small" style="margin-top:6px">${fmt(g)} ${J.items.some(i => unitOf(i.food) === 'ml') ? 'ml/g' : 'g'} in total · fibre ${fmt(tot.fib || 0, 1)} g · sugar ${fmt(tot.sug || 0, 1)} g${tot.vc != null ? ` · vitamin C ${fmt(tot.vc, 0)} mg` : ''}</div>`;
    card.querySelectorAll('[data-j="commit"],[data-j="update"],[data-j="update-log"]').forEach(b => { b.disabled = !(J.items.length && g > 0 && (!isSoup() || soupPortion() > 0)); });
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
      const g0 = juiceDefault(f, Number(a.dataset.s));
      const byCount = f.each && !(isYog() && Number(a.dataset.s) === 0);
      J.items.push(byCount ? { food: f, mode: 'n', n: Math.max(0.5, Math.round(g0 / f.each.g * 2) / 2), g: Math.max(0.5, Math.round(g0 / f.each.g * 2) / 2) * f.each.g } : { food: f, g: g0, mode: 'g' });
      const body = card.querySelector('.modal-body'); const top = body ? body.scrollTop : 0;
      renderJuice();
      const nb = card.querySelector('.modal-body'); if (nb) nb.scrollTop = top;
      toast(`Added ${f.name}. Set the amount below.`);
      return;
    }
    if (act === 'mode') {
      const it = J.items[Number(a.dataset.i)]; if (!it || !it.food.each) return;
      it.mode = a.dataset.mode;
      if (it.mode === 'n') { it.n = Math.max(0.5, Math.round((Number(it.g) || 0) / it.food.each.g * 2) / 2); it.g = it.n * it.food.each.g; }
      const body = card.querySelector('.modal-body'); const top = body ? body.scrollTop : 0;
      renderJuice(); const nb = card.querySelector('.modal-body'); if (nb) nb.scrollTop = top;
      const inp = card.querySelector(`[data-ji="${a.dataset.i}"]`); if (inp) { inp.focus(); try { inp.select(); } catch (_) {} }
      return;
    }
    if (act === 'pot') { J.potMl = Number(a.dataset.b) * BOWL_ML; const sp = $('#spot'); if (sp) sp.value = J.potMl; card.querySelectorAll('[data-j="pot"]').forEach(b => b.classList.toggle('on', b === a)); refreshJuiceTotals(); return; }
    if (act === 'bowl') { J.portionMl = Number(a.dataset.b) * BOWL_ML; const sm = $('#sml'); if (sm) sm.value = J.portionMl; card.querySelectorAll('[data-j="bowl"]').forEach(b => b.classList.toggle('on', b === a)); refreshJuiceTotals(); return; }
    if (act === 'del') { const body = card.querySelector('.modal-body'); const top = body.scrollTop; J.items.splice(Number(a.dataset.i), 1); renderJuice(); card.querySelector('.modal-body').scrollTop = top; return; }
    if (act === 'update' || act === 'update-log') {
      const { tot, g } = juiceTotals(); if (!(g > 0)) return;
      const f = S.customFoods.find(x => x.id === J.editId); if (!f) return;
      const base = isSoup() ? soupPot() : g;
      const n = {}; for (const k of NKEYS) n[k] = tot[k] == null ? null : Math.round(tot[k] / base * 100 * 1000) / 1000;
      Object.assign(f, { name: juiceName(), n, recipe: J.items.map(i => ({ id: i.food.id, name: i.food.name, g: Number(i.g) || 0 })), savedAt: Date.now() },
        isSoup() ? { unit: 'ml', portion: BOWL_ML, potMl: Number(J.potMl) > 0 ? Number(J.potMl) : null } : { portion: Math.round(g), unit: !isYog() && J.items.some(i => unitOf(i.food) === 'ml') ? 'ml' : 'g' });
      if (act === 'update') { save(); J = null; closeModal(); render(); toast(`Saved changes to ${f.name}. Past diary entries keep their old values.`); return; }
      J.saveRecipe = false; J.logFoodId = f.id; J.editId = null; // fall through to log it once
    }
    if ((act === 'commit' || act === 'update-log') && isSoup()) {
      const { tot } = juiceTotals();
      const pot = soupPot(), por = soupPortion(); if (!(pot > 0 && por > 0)) return;
      const n = {}; for (const k of NKEYS) n[k] = tot[k] == null ? null : Math.round(tot[k] / pot * 100 * 1000) / 1000;
      const name = juiceName(), each = { g: BOWL_ML, one: 'bowl', many: 'bowls' };
      const food = { id: J.logFoodId || ('mine-' + uid()), name, source: 'Mine', cat: 'Meals & takeaway', unit: 'ml', portion: BOWL_ML, portionLabel: '1 bowl (500 ml)', each, n,
        recipe: J.items.map(i => ({ id: i.food.id, name: i.food.name, g: Number(i.g) || 0 })), recipeKind: 'soup', potMl: Number(J.potMl) > 0 ? Number(J.potMl) : null, savedAt: Date.now() };
      if (J.saveRecipe) S.customFoods.unshift(food);
      if (Number(J.potMl) > 0) P().profile.soupPotMl = Number(J.potMl); // remember this person's usual pot
      const count = Math.abs(por / BOWL_ML * 4 - Math.round(por / BOWL_ML * 4)) < 1e-9 ? por / BOWL_ML : null;
      const list = P().diary[J.date] || (P().diary[J.date] = []);
      list.push({ id: uid(), foodId: food.id, name, grams: Math.round(por), count, each: count != null ? each : null, unit: 'ml', meal: J.meal, n: { ...n }, portion: BOWL_ML, portionLabel: food.portionLabel, source: 'Mine', at: Date.now(), recipe: food.recipe });
      remember(food); save();
      const date = J.date, meal = J.meal; J = null; closeModal();
      if (UI.view === 'today') { UI.date = date; render(); }
      toast(`Added ${name} (${fmt((tot.kcal || 0) * por / pot)} kcal) to ${meal.toLowerCase()}.`);
      return;
    }
    if (act === 'commit' || act === 'update-log') {
      const { tot, g } = juiceTotals(); if (!(g > 0)) return;
      const n = {}; for (const k of NKEYS) n[k] = tot[k] == null ? null : Math.round(tot[k] / g * 100 * 1000) / 1000;
      const name = juiceName();
      const yogB = isYog(), liquid = !yogB && J.items.some(i => unitOf(i.food) === 'ml');
      const food = { id: J.logFoodId || ('mine-' + uid()), name, source: 'Mine', cat: yogB ? 'Meals & takeaway' : 'Drinks', unit: liquid ? 'ml' : 'g', portion: Math.round(g), portionLabel: yogB ? '1 bowl (as made)' : '1 serving (as made)', n,
        recipe: J.items.map(i => ({ id: i.food.id, name: i.food.name, g: Number(i.g) || 0 })), ...(yogB ? { recipeKind: 'bowl' } : {}), savedAt: Date.now() };
      if (J.saveRecipe) S.customFoods.unshift(food);
      const list = P().diary[J.date] || (P().diary[J.date] = []);
      list.push({ id: uid(), foodId: food.id, name, grams: Math.round(g), count: null, each: null, unit: food.unit, meal: J.meal, n: { ...n }, portion: food.portion, portionLabel: food.portionLabel, source: 'Mine', at: Date.now(), recipe: food.recipe });
      remember(food); save();
      const date = J.date, meal = J.meal; J = null; closeModal();
      if (UI.view === 'today') { UI.date = date; render(); }
      toast(`Added ${name} (${fmt(tot.kcal || 0)} kcal) to ${meal.toLowerCase()}.`);
    }
  }

  // Quick add: just calories (and macros if you know them), no food needed.
  function quickAdd(meal, date) {
    M = null; card.className = 'modal-card narrow'; card.onclick = null;
    card.innerHTML = `<div class="modal-head"><h2>Quick add · ${esc(meal)}</h2><button class="btn ghost" data-q="close">Close</button></div>
      <div class="modal-body">
        <label class="field"><span>Calories</span><input type="number" id="qk" inputmode="numeric" min="1" max="5000" placeholder="e.g. 300" style="font-size:28px"></label>
        <div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:10px">
          <label class="field"><span>Protein g</span><input type="number" id="qp" inputmode="decimal" min="0" placeholder="optional"></label>
          <label class="field"><span>Carbs g</span><input type="number" id="qc" inputmode="decimal" min="0" placeholder="optional"></label>
          <label class="field"><span>Fat g</span><input type="number" id="qf" inputmode="decimal" min="0" placeholder="optional"></label>
        </div>
        <label class="field" style="margin-top:10px"><span>Name (optional)</span><input type="text" id="qn" maxlength="50" placeholder="e.g. Coffee shop muffin"></label>
        <label class="field" style="margin-top:10px"><span>Meal</span><select id="qm">${MEALS.map(m => `<option ${m === meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <div style="margin-top:16px"><button class="btn primary" data-q="add">Add</button></div>
      </div>`;
    modal.hidden = false;
    setTimeout(() => { const i = $('#qk'); if (i) i.focus(); }, 30);
    card.onclick = e => {
      const b = e.target.closest('[data-q]'); if (!b) return;
      if (b.dataset.q === 'close') return closeModal();
      const kcal = Number($('#qk').value);
      if (!(kcal > 0)) { toast('Type how many calories.'); return; }
      const num = id => { const v = Number($(id).value); return v > 0 ? v : 0; };
      const n = {}; for (const k of NKEYS) n[k] = null;
      Object.assign(n, { kcal, p: num('#qp'), c: num('#qc'), f: num('#qf') });
      const m = $('#qm').value, name = $('#qn').value.trim() || 'Quick add';
      (P().diary[date] = P().diary[date] || []).push({ id: uid(), foodId: 'quick', name, grams: 100, count: null, each: null, unit: 'g', meal: m, n, source: 'Quick add', quick: true, at: Date.now() });
      save(); closeModal();
      if (UI.view === 'today') { UI.date = date; render(); }
      toast(`Added ${fmt(kcal)} kcal to ${m.toLowerCase()}.`);
    };
    card.addEventListener('keydown', function enter(e) { if (e.key === 'Enter' && card.querySelector('[data-q="add"]')) card.querySelector('[data-q="add"]').click(); });
  }
  function logFavourite(id) {
    const fav = (P().profile.favMeals || []).find(f => f.id === id); if (!fav || !M) return;
    const date = M.date, meal = M.meal;
    const list = P().diary[date] || (P().diary[date] = []);
    for (const it of fav.items) list.push({ ...JSON.parse(JSON.stringify(it)), id: uid(), meal, at: Date.now() });
    save(); closeModal();
    if (UI.view === 'today') { UI.date = date; render(); }
    toast(`Added ${fav.name} (${fmt(fav.items.reduce((a, e) => a + (e.n.kcal || 0) * e.grams / 100, 0))} kcal) to ${meal.toLowerCase()}.`);
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
      if (M.linkCode) { const links = P().profile.barcodeLinks || (P().profile.barcodeLinks = {}); links[M.linkCode] = f.id; M.linkCode = null; save(); toast(`Linked. Scanning this barcode now goes straight to ${f.name}.`); }
      if (!M.entry && f.cat === 'Supplements') M.meal = 'Supplements';
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
    else if (m === 'fav-log') logFavourite(a.dataset.id);
    else if (m === 'fav-del') { P().profile.favMeals = (P().profile.favMeals || []).filter(f => f.id !== a.dataset.id); save(); renderResults(); toast('Favourite removed.'); }
    else if (m === 'quick') { const mm = M.meal, d = M.date; closeModal(); quickAdd(mm, d); }
    else if (m === 'juice') openJuice({ date: M.date, meal: M.meal });
    else if (m === 'soup') openJuice({ date: M.date, meal: M.meal }, null, 'soup');
    else if (m === 'bowl') openJuice({ date: M.date, meal: M.meal }, null, 'bowl');
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
        ${maintenanceTile()}
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
    ggCheckEvents().catch(() => {});
  }
  function myPoints() { return social.pointsFor(S); }
  function rankingRows() {
    const me = window.MH_ME || {};
    const pg = social.progressOf(S);
    const rows = [{ id: 'me', name: P().name, color: P().color, goal: (P().profile.goal || '').startsWith('lose') ? 'lose' : P().profile.goal, points: myPoints(), me: true,
      kg: { s: pg.start ? pg.start.kg : null, c: pg.latest ? pg.latest.kg : null, a: pg.avg, w: pg.perWeek, g: P().profile.goalWeightKg ?? null } }];
    for (const f of (F.list || []).filter(x => x.status === 'accepted')) {
      let kg = null; try { kg = f.profile.points_detail ? JSON.parse(f.profile.points_detail) : null; } catch (_) {}
      rows.push({ id: f.id, name: f.profile.name, color: f.profile.color, goal: f.profile.goal, points: f.profile.points, updated: f.profile.points_updated, friend: f, kg });
    }
    return rows.sort((a, b) => (b.points ?? -1e9) - (a.points ?? -1e9));
  }
  // Start weight -> goal weight, with a marker where the person is now.
  function progressBar(r) {
    const k = r.kg || {}, pct = r.points == null ? 0 : Math.max(0, Math.min(100, r.points));
    const has = k.s != null && k.c != null;
    const maint = r.goal === 'maintain' || k.g == null;
    return `<div class="rk-prog">
      <div class="rk-track"><i style="width:${pct}%"></i>${has ? `<b style="left:${pct}%"></b>` : ''}</div>
      <div class="rk-labels">${has ? `<span>Start ${fmt(k.s, 1)} kg</span><span class="rk-now">Now ${fmt(k.c, 1)} kg${k.a != null && Math.abs(k.a - k.c) >= 0.05 ? ` · avg ${fmt(k.a, 1)}` : ''}</span><span>${maint ? 'Maintain' : `Goal ${fmt(k.g, 1)} kg`}</span>` : '<span class="faint">Waiting for a weigh-in</span>'}</div>
      ${has && k.w != null ? `<div class="rk-rate ${(r.goal === 'gain' ? k.w > 0 : r.goal === 'lose' ? k.w < 0 : Math.abs(k.w) < 0.25) ? 'good' : 'bad'}">${k.w > 0 ? '+' : k.w < 0 ? '−' : ''}${fmt(Math.abs(k.w), 2)} kg/week lately</div>` : ''}
    </div>`;
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
      <div class="page-head"><div><h1>Ranked</h1><p class="sub">${ME().username ? `You're <b>@${esc(ME().username)}</b> ${flagOf(ME().country)}. Friends can find you by searching it.` : '<button class="link-btn" data-action="u-change">Choose your username</button> so friends can find you.'}</p></div><button class="btn icon search-btn" data-action="u-find" aria-label="Find friends">🔍</button></div>
      ${needGoal ? `<div class="nudge"><span><b>Set your goal to join the ranking.</b> Choose lose, gain or maintain and a goal weight in Settings. Your points start from your weight on that day.</span><button class="btn primary" data-action="go-settings">Set goal</button></div>` : ''}
      <div class="grid-2">
        ${ggLadderPanel()}
        <div class="stack">
          ${searchPanel()}
          ${incoming.length ? `<div class="panel"><h2>Friend requests</h2>${incoming.map(f => `<div class="frow"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)} ${flagOf(f.profile.country)}${f.profile.username ? `<small class="faint">@${esc(f.profile.username)}</small>` : ''}</span><button class="btn primary" data-action="f-accept" data-id="${esc(f.id)}">Accept</button><button class="btn ghost" data-action="f-remove" data-id="${esc(f.id)}">Decline</button></div>`).join('')}</div>` : ''}
          ${outgoing.length ? `<div class="panel"><h2>Waiting for them to accept</h2>${outgoing.map(f => `<div class="frow"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)} ${flagOf(f.profile.country)}${f.profile.username ? `<small class="faint">@${esc(f.profile.username)}</small>` : ''}</span><button class="btn ghost" data-action="f-remove" data-id="${esc(f.id)}">Cancel</button></div>`).join('')}</div>` : ''}
          ${friends.length ? `<div class="panel"><h2>Your friends</h2><p class="muted small" style="margin-top:-6px">Friends can see your ranking points, what you eat each day and your weight history, and get told in the app when you log food. To stop sharing with someone, remove them as a friend.</p>
            ${friends.map(f => `<div class="frow"><span class="avatar" style="background:${esc(f.profile.color || '#888')}">${esc((f.profile.name || '?').charAt(0))}</span><span class="fname">${esc(f.profile.name)} ${flagOf(f.profile.country)}${f.profile.username ? `<small class="faint">@${esc(f.profile.username)}</small>` : ''}</span><button class="btn" data-action="f-view" data-id="${esc(f.id)}">View</button></div>`).join('')}</div>` : ''}
          ${F.err ? `<div class="panel flat"><span class="err">${esc(F.err)}</span></div>` : ''}
        </div>
      </div>
    </div>`;
    wireSearch();
    const cs = $('#ctySel'); if (cs) cs.addEventListener('change', async () => { try { await social.setCountry(cs.value); toast(cs.value ? `Flag set to ${window.MHCountries.flag(cs.value)} ${window.MHCountries.nameOf(cs.value)}.` : 'Flag removed.'); render(); } catch (e) { toast('Could not save: ' + e.message); } });
  }

  async function loadFriendData(f, day) {
    F.data = { loading: true };
    renderFriendProfile();
    const out = { day, entries: [], weights: {}, garmin: null, dayMeta: null };
    try {
      const kinds = [];
      if (true) kinds.push('entry', 'daymeta', 'garmin');
      if (true) kinds.push('weight');
      if (kinds.length) {
        const rowsDay = true ? await social.friendItems(f.id, ['entry', 'daymeta', 'garmin'], day, day) : [];
        const rowsW = true ? await social.friendItems(f.id, ['weight'], addDays(todayKey(), -120), null) : [];
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
    const nothingShared = false;
    let wchart = '';
    if (wk.length >= 2) {
      const keys = rangeKeys(todayKey(), 90);
      wchart = lineChart({ labels: keys.map(shortDate), tipLabels: keys.map(longDate), series: [{ label: 'Weight', color: WCOL, values: keys.map(k => d.weights[k] ?? null), connect: true, dots: true }], height: 200, tipFmt: v => fmt(v, 1) + ' kg', yFmt: v => fmt(v, 0) });
    }
    const meals = MEALS.map(m => { const list = (d.entries || []).filter(e => e.meal === m); return list.length ? `<div class="cmp-meal"><b>${m}</b> <span class="faint num">${fmt(totalsOf(list).kcal)} kcal</span><ul>${list.map(e => `<li><span>${esc(e.name)}</span><span class="faint num">${esc(entryAmount(e))} · ${fmt(e.n.kcal * e.grams / 100)}</span></li>`).join('')}</ul></div>` : ''; }).join('');
    const g = d.garmin;
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><button class="btn primary back-friends" data-action="f-back">‹ Back to Friends</button><h1 style="display:flex;align-items:center;gap:10px">${(() => { let st = {}; try { st = JSON.parse(f.profile.game || '{}'); } catch (_) {} return avatarHtml({ name: f.profile.name, color: f.profile.color, avatar: f.profile.avatar, tier: st.t || null }, 'big'); })()}<span>${esc(f.profile.name)} ${flagOf(f.profile.country)}${f.profile.username ? `<small class="faint" style="display:block;font-size:14px;font-weight:600">@${esc(f.profile.username)}</small>` : ''}</span></h1>
        <p class="sub">${goalText(f.profile.goal)} · ${pointsText(f.profile.points)} of the way to goal${f.profile.points_updated ? ' · updated ' + esc(new Date(f.profile.points_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })) : ''}</p></div>
        ${true ? `<div class="datebar"><button class="btn icon" data-action="f-day" data-d="-1" aria-label="Previous day">‹</button><span class="num" style="min-width:110px;text-align:center">${F.day === todayKey() ? 'Today' : esc(shortDate(F.day))}</span><button class="btn icon" data-action="f-day" data-d="1" ${F.day >= todayKey() ? 'disabled' : ''} aria-label="Next day">›</button></div>` : ''}
      </div>
      ${d.loading ? '<p class="muted">Loading…</p>' : d.error ? `<p class="err">${esc(d.error)}</p>` : nothingShared ? `<div class="panel"><p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their food or weight with you. You can still see their ranking points.</p></div>` : `
      ${reactBar(f, F.day)}
      <div class="grid-2">
        ${true ? `<div class="panel"><h2>What ${esc(f.profile.name)} ate</h2>
          <div class="cmp-kcal"><span class="num">${fmt(t.kcal)}</span><small>kcal${d.dayMeta && d.dayMeta.complete ? ' · day complete' : ''}</small></div>
          <div class="pmac" style="margin-bottom:12px"><div class="p"><b>${fmt(t.p)} g</b><span>Protein</span></div><div class="c"><b>${fmt(t.c)} g</b><span>Carbs</span></div><div class="f"><b>${fmt(t.f)} g</b><span>Fat</span></div></div>
          ${meals || '<p class="muted">Nothing logged this day.</p>'}
          ${g ? `<div class="kv" style="margin-top:12px"><span>Sleep</span><span>${g.sleepSec ? hm(g.sleepSec) : '–'}</span><span>Steps</span><span>${g.steps != null ? fmt(g.steps) : '–'}</span><span>Avg / peak heart rate</span><span>${g.avgHr || g.maxHr ? fmt(g.avgHr) + ' / ' + fmt(g.maxHr) + ' bpm' : '–'}</span></div>` : ''}
        </div>` : `<div class="panel"><p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their food diary with you.</p></div>`}
        <div class="panel"><h2>Weight</h2>${true ? (wk.length ? `<div class="big-score"><span class="v">${fmt(d.weights[wk[wk.length - 1]], 1)}</span><span class="q">kg on ${esc(shortDate(wk[wk.length - 1]))}</span></div>${wchart}` : '<p class="muted">No weigh-ins yet.</p>') : `<p class="muted" style="margin:0">${esc(f.profile.name)} hasn't shared their weight with you.</p>`}</div>
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
      SERVER_NOTES = l; mergeNotes();
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
    if (NOTES.unread) { social.markRead().catch(() => {}); NOTES.list.forEach(n => n.read = true); ggNotes().forEach(n => n.read = true); save(); NOTES.unread = 0; renderMe(); }
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

  // Maintenance calories: what keeps weight steady. From the logs (food eaten vs how
  // weight moved) next to the standard estimate from age, height, weight and activity.
  function maintenanceTile() {
    const pr = P().profile, met = metabolismModel();
    const lw = latestWeight();
    const w = lw ? lw.kg : pr.weightKg;
    const formula = Math.round(bmrFor(w, pr) * pr.activity / 10) * 10;
    let logs = '';
    if (met.ready) logs = `<div class="mt-v num">${fmt(Math.round(met.measured / 10) * 10)}<small>kcal/day</small></div><div class="d">You ate ~${fmt(met.intake)} a day while weight moved ${met.kgPerWeek >= 0 ? '+' : ''}${fmt(met.kgPerWeek, 2)} kg/week${met.confidence === 'early' ? ' · early estimate' : ''}</div>`;
    else {
      const need = [];
      if (met.loggedDays < met.needDays) need.push(`${met.needDays - met.loggedDays} more logged day${met.needDays - met.loggedDays === 1 ? '' : 's'}`);
      if (met.weighIns < met.needWeighIns) need.push(`${met.needWeighIns - met.weighIns} more weigh-in${met.needWeighIns - met.weighIns === 1 ? '' : 's'}`);
      if (met.spanDays < met.needSpan) need.push(`weigh-ins over ${met.needSpan}+ days`);
      logs = `<div class="mt-v" style="font-size:20px">Learning…</div><div class="d">Needs ${esc(need.join(', '))} in the last 4 weeks.</div>`;
    }
    const diff = met.ready ? Math.round(met.measured - formula) : null;
    return `<div class="stat maint" title="Maintenance = the calories that keep your weight where it is.">
      <div class="k">Maintenance calories</div>
      <div class="maint-grid">
        <div><div class="mt-k">From your logs</div>${logs}</div>
        <div><div class="mt-k">From age, height & weight</div><div class="mt-v num">${fmt(formula)}<small>kcal/day</small></div><div class="d">${pr.sex === 'female' ? 'Woman' : 'Man'}, ${fmt(pr.age)}, ${fmt(pr.heightCm)} cm, ${fmt(w, 1)} kg, activity ×${pr.activity}</div></div>
      </div>
      ${diff != null ? `<div class="d" style="margin-top:6px">Your real maintenance is <b>${fmt(Math.abs(diff))} kcal ${diff >= 0 ? 'higher' : 'lower'}</b> than the formula says.</div>` : ''}
    </div>`;
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
    const col = met.pct <= -5 ? 'var(--low)' : met.pct >= 5 ? 'var(--pro)' : 'var(--ok)';
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
    if (act === 'u-find') { const p = $('#findPanel'); if (p) { p.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => { const i = $('#uSearch'); if (i) i.focus(); }, 300); } return; }
    if (act === 'u-change') { usernameGate(true); return; }
    if (act === 'u-add') {
      a.disabled = true; a.textContent = 'Sending…';
      try { const r = await social.addFriend(a.dataset.code); if (r && r.ok === false) throw new Error(r.error || 'Could not add'); SR.sent.add(a.dataset.id); toast(r && r.status === 'accepted' ? 'You\'re now friends!' : 'Friend request sent.'); loadFriends(true); }
      catch (er) { toast('Could not add: ' + er.message); }
      const box = $('#uResults'); if (box) box.innerHTML = searchResults(id => SR.sent.has(id) ? 'sent' : '');
      return;
    }
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
      <div class="modal-foot">${f.source !== 'Built-in' ? `<button class="btn danger" data-f="del">Delete</button>${f.source === 'Mine' ? (f.recipe ? '<button class="btn" data-f="recipe">Edit recipe</button>' : '<button class="btn" data-f="edit">Edit</button>') : ''}` : ''}<button class="btn primary" data-f="log">Log this food</button></div>`;
    modal.hidden = false;
    card.onclick = (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      if (b.dataset.f === 'close') closeModal();
      if (b.dataset.f === 'log') { closeModal(); openAdd({ date: UI.date, meal: guessMeal(), food: f }); }
      if (b.dataset.f === 'edit') foodForm(f);
      if (b.dataset.f === 'recipe') openJuice({ date: UI.date, meal: guessMeal() }, f);
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
  const GOALS = [['cut', 'Lose fat (shred)'], ['recomp', 'Body recomposition'], ['bulk', 'Build muscle (bulk)'], ['maintain', 'Maintain']];
  const DOW = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  function macroTable(train, rest) {
    const r = (lab, m) => `<div><span class="faint small">${lab}</span><b class="num">${fmt(m.kcal)} kcal</b><span class="num">${fmt(m.p)} g protein · ${fmt(m.c)} g carbs · ${fmt(m.f)} g fat</span></div>`;
    return `<div class="mac-table">${r(rest ? '🏋️ Training day' : 'Every day', train)}${rest ? r('😴 Rest day', rest) : ''}</div>`;
  }
  function trainDaysChips() {
    const td = P().targets.trainDays || [];
    return `<div class="j-set-h" style="margin-top:12px"><b>Your usual training days</b> <span class="faint small">the diary picks training or rest by itself; you can still switch any day</span></div>
      <div class="chips">${DOW.map(([d, l]) => `<button class="chip ${td.includes(d) ? 'on' : ''}" data-action="tday" data-d="${d}">${l}</button>`).join('')}</div>`;
  }
  function targetsPanel(at) {
    const T = P().targets, pr = P().profile;
    const mode = T.auto ? 'auto' : T.mode === 'plan' && T.plan ? 'plan' : (UI.tmode === 'plan' ? 'plan' : 'own');
    const seg = `<div class="seg tmode" style="margin-top:16px">${[['auto', 'Automatic'], ['plan', 'Plan for my goal'], ['own', 'Set my own']].map(([v, l]) => `<button class="${(UI.tmode || mode) === v ? 'on' : ''}" data-action="tmode" data-v="${v}">${l}</button>`).join('')}</div>`;
    const view = UI.tmode || mode;
    if (view === 'auto') return seg + `<div class="targets-out"><div><b>${fmt(at.kcal)}</b><span>kcal / day</span></div><div><b>${fmt(at.p)} g</b><span>protein</span></div><div><b>${fmt(at.c)} g</b><span>carbs</span></div><div><b>${fmt(at.f)} g</b><span>fat</span></div></div>
      <p class="muted small">Based on the Mifflin-St Jeor formula: about ${fmt(at.bmr)} kcal at rest, times your activity level${pr.goal !== 'maintain' ? ', adjusted for your goal' : ''}.${T.auto ? '' : ' <b>Tap "Use automatic" to switch to these.</b>'}</p>${T.auto ? '' : '<button class="btn" data-action="tuse-auto">Use automatic</button>'}`;
    if (view === 'plan') {
      const plan = T.mode === 'plan' && T.plan;
      if (plan && !UI.planEdit) {
        const end = addDays(plan.start, Math.round((plan.weeksNeeded || plan.weeks) * 7));
        return seg + `<div class="plan-sum"><div><b>${esc((GOALS.find(g => g[0] === plan.goal) || [])[1] || plan.goal)}</b>${plan.goal === 'maintain' || plan.goal === 'recomp' ? '' : ` · ${fmt(plan.startKg, 1)} → ${fmt(plan.goalKg, 1)} kg`}</div>
          <div class="faint small">Started ${esc(shortDate(plan.start))}${plan.goal === 'cut' || plan.goal === 'bulk' ? ` · aiming for about ${esc(longDate(end))} · ${plan.rate >= 0 ? '+' : ''}${fmt(plan.rate, 2)} kg a week` : ''} · maintenance ${fmt(plan.maint)} kcal (${plan.maintSource === 'logs' ? 'measured from your logs' : 'from the formula'})</div></div>
          ${macroTable({ kcal: T.kcal, p: T.p, c: T.c, f: T.f }, splitOn() ? T.rest : null)}
          <p class="muted small">Every week the app compares your weight trend with the plan. If you are off track it suggests a change on your diary, and you approve or decline it.${T.lastCheck ? ' Last check: ' + esc(shortDate(T.lastCheck)) + '.' : ''}</p>
          ${trainDaysChips()}
          <div style="margin-top:12px"><button class="btn" data-action="plan-edit">Change plan</button></div>`;
      }
      const d = UI.planForm || (UI.planForm = { goal: plan ? plan.goal : (pr.goal === 'gain' ? 'bulk' : pr.goal === 'maintain' ? 'maintain' : 'cut'), goalKg: pr.goalWeightKg || '', weeks: plan ? plan.weeks : 16 });
      const res = UI.planResult;
      return seg + `<div class="form-grid" style="margin-top:12px">
          <label class="field"><span>Goal</span><select id="pgGoal">${GOALS.map(([v, l]) => `<option value="${v}" ${d.goal === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="field"><span>Target weight (kg)</span><input type="number" id="pgKg" value="${esc(d.goalKg)}" step="0.1" min="30" max="250" placeholder="e.g. 85"></label>
          <label class="field"><span>Time frame (weeks)</span><input type="number" id="pgWeeks" value="${esc(d.weeks)}" min="2" max="104"></label>
        </div>
        <div class="chips" style="margin-top:8px">${[8, 12, 16, 20, 26, 52].map(w => `<button class="chip ${Number(d.weeks) === w ? 'on' : ''}" data-action="pg-weeks" data-w="${w}">${w === 26 ? '6 months' : w === 52 ? '1 year' : w + ' weeks'}</button>`).join('')}</div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-action="plan-calc">Suggest my macros</button>${plan ? '<button class="btn ghost" data-action="plan-cancel">Cancel</button>' : ''}</div>
        ${res ? `<div class="plan-res">
          <div class="faint small">Maintenance ${fmt(res.maint)} kcal a day (${res.maintSource === 'logs' ? 'measured from what you ate and how your weight moved' : 'from your age, height, weight and activity; it gets measured once you have 2+ weeks of logs and weigh-ins'}).${res.goal === 'cut' || res.goal === 'bulk' ? ` Expected change: <b>${res.rate >= 0 ? '+' : ''}${fmt(res.rate, 2)} kg a week</b>${res.weeksNeeded ? `, reaching ${fmt(res.goalKg, 1)} kg in about ${Math.ceil(res.weeksNeeded)} weeks` : ''}.` : ''}</div>
          ${res.warn.map(w => `<div class="sup-warn"><p>⚠ ${esc(w)}</p></div>`).join('')}
          ${macroTable(res.train, res.rest)}
          <p class="muted small">Eat most of the carbs in the meals before and after training. Rest days move some carbs to fat; your weekly total stays about the same.</p>
          <button class="btn primary" data-action="plan-use">Use this plan</button></div>` : ''}`;
    }
    // own
    const tr = { kcal: T.kcal, p: T.p, c: T.c, f: T.f }, rs = T.rest || { kcal: T.kcal, p: T.p, c: T.c, f: T.f };
    const inputs = (attr, m) => `<label class="field"><span>Protein (g)</span><input type="number" ${attr}="p" value="${m.p}"></label><label class="field"><span>Carbs (g)</span><input type="number" ${attr}="c" value="${m.c}"></label><label class="field"><span>Fat (g)</span><input type="number" ${attr}="f" value="${m.f}"></label><div class="field"><span>Calories</span><b class="num own-kcal">${fmt(macroKcal(m))} kcal</b></div>`;
    return seg + `<label class="check" style="margin-top:12px"><input type="checkbox" id="tsplit" ${T.split ? 'checked' : ''}> Different targets on rest days</label>
      <div class="j-set-h" style="margin-top:10px"><b>${T.split ? '🏋️ Training day' : 'Every day'}</b></div><div class="form-grid own-grid">${inputs('data-t', tr)}</div>
      ${T.split ? `<div class="j-set-h" style="margin-top:10px"><b>😴 Rest day</b></div><div class="form-grid own-grid">${inputs('data-r', rs)}</div>` : ''}
      <p class="muted small">Calories are worked out from your macros (4 kcal per g of protein and carbs, 9 per g of fat). These stay exactly as you set them.</p>
      ${T.split ? trainDaysChips() : ''}`;
  }
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
          ${targetsPanel(at)}
        </div>
        </div>

        <div class="stack">
          ${window.desktop ? '' : `<div class="panel">
            <h2>Daily reminder</h2>
            <p class="muted small" style="margin-top:0">Adds a repeating reminder to your phone's calendar, so you get a nudge to log your food even when the app is closed.</p>
            <div class="row-inline" style="align-items:center"><select id="remTime" style="max-width:140px">${Array.from({ length: 48 }, (_, i) => { const hm = String(Math.floor(i / 2)).padStart(2, '0') + (i % 2 ? '30' : '00'); return `<option value="${hm}" ${hm === (st.reminderTime || '21:00').replace(':', '') ? 'selected' : ''}>${hm.slice(0, 2)}:${hm.slice(2)}</option>`; }).join('')}</select>
              <a class="btn primary" id="remLink" href="reminders/${esc((st.reminderTime || '21:00').replace(':', ''))}.ics" target="_blank" rel="noopener">Add to my calendar</a></div>
            <p class="faint small">Tap <b>Add All</b> when your calendar opens. To stop it, delete the event in your calendar.</p>
          </div>`}
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
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-action="sync-now">Sync now</button><button class="btn" data-action="export">Save a backup file</button><button class="btn" data-action="import">Restore from a file</button></div>
            <h3 style="margin:16px 0 6px">Automatic backups</h3>
            <p class="muted small" style="margin-top:0">Your account is backed up on the server every Monday, and the last 8 are kept.${window.desktop ? ' This PC also saves a backup file in Documents › GG Gains Backups every week.' : ''}</p>
            <div id="bkList" class="small muted">Loading…</div>
            <button class="btn" data-action="backup-now" style="margin-top:8px">Back up now</button></div>
          </div>
        </div>
      </div>
      <p class="faint small" style="margin-top:20px">GG Gains v${esc(VERSION)}. Nutrition values are averages from USDA FoodData Central and UK product labels; targets are general adult guidance, not medical advice.</p>
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
    const ownSet = (key, el) => { const v = Number(el.value); if (!(v >= 0)) return; const T = P().targets; T.auto = false; T.mode = 'own';
      if (key === 'r') { T.rest = T.rest || { p: T.p, c: T.c, f: T.f }; T.rest[el.dataset.r] = v; T.rest.kcal = macroKcal(T.rest); } else { T[el.dataset.t] = v; T.kcal = macroKcal(T); }
      save(); softRender(renderSettings); };
    main.querySelectorAll('[data-t]').forEach(el => el.addEventListener('change', () => ownSet('t', el)));
    main.querySelectorAll('[data-r]').forEach(el => el.addEventListener('change', () => ownSet('r', el)));
    const ts = $('#tsplit'); if (ts) ts.addEventListener('change', () => { const T = P().targets; T.auto = false; T.mode = 'own'; T.split = ts.checked; if (ts.checked && !T.rest) { T.rest = { p: T.p, c: Math.max(40, T.c - 40), f: T.f + 15 }; T.rest.kcal = macroKcal(T.rest); } save(); softRender(renderSettings); });
    ['pgGoal', 'pgKg', 'pgWeeks'].forEach(id => { const el = $('#' + id); if (el) el.addEventListener('change', () => { const d = UI.planForm || (UI.planForm = {}); d.goal = $('#pgGoal').value; d.goalKg = $('#pgKg').value; d.weeks = $('#pgWeeks').value; UI.planResult = null; softRender(renderSettings); }); });
    $('#pName').addEventListener('change', e => { const v = e.target.value.trim(); if (v) { P().name = v; save(); softRender(render); } });
    loadBackupList();
    const rt = $('#remTime'); if (rt) rt.addEventListener('change', () => { $('#remLink').href = 'reminders/' + rt.value + '.ics'; S.settings.reminderTime = rt.value.slice(0, 2) + ':' + rt.value.slice(2); save(); });
    main.querySelectorAll('[data-rem]').forEach(el => el.addEventListener('change', () => { P().reminderOn = el.checked; save(); }));
    main.querySelectorAll('[data-s]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.s;
      S.settings[k] = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (k === 'theme') { applyTheme(); }
      if (k === 'startWithWindows' && window.desktop && window.desktop.setStartup) window.desktop.setStartup(el.checked);
      save(); softRender(renderSettings);
    }));
  }

  async function loadBackupList() {
    const box = $('#bkList'); if (!box) return;
    try {
      const l = await social.backups();
      if (!$('#bkList')) return;
      $('#bkList').innerHTML = l.length ? `<ul class="bk-list">${l.map(b => `<li><span>${esc(new Date(b.taken_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))} <span class="faint">· ${fmt(b.item_count)} items</span></span><button class="btn ghost" data-action="bk-restore" data-id="${b.id}">Restore</button></li>`).join('')}</ul>` : 'No backups yet. The first one is made on Monday, or tap Back up now.';
    } catch (e) { if ($('#bkList')) $('#bkList').textContent = e.offline ? 'Backups show when you are online.' : (e.status === 404 ? 'Backups are being set up.' : 'Could not load backups.'); }
  }
  async function handleFoodsSettingsAction(act, a) {
    const T = P().targets;
    if (act === 'tmode') { UI.tmode = a.dataset.v; UI.planEdit = false; if (a.dataset.v === 'own' && T.auto) { const at = autoTargets(P().profile); Object.assign(T, { auto: false, mode: 'own', kcal: at.kcal, p: at.p, c: at.c, f: at.f }); save(); } else if (a.dataset.v === 'own' && T.mode !== 'own') { T.mode = 'own'; save(); } renderSettings(); return; }
    if (act === 'tuse-auto') { T.auto = true; T.mode = 'auto'; UI.tmode = null; save(); renderSettings(); toast('Using automatic targets.'); return; }
    if (act === 'tday') { const d = Number(a.dataset.d), td = new Set(T.trainDays || []); td.has(d) ? td.delete(d) : td.add(d); T.trainDays = [...td].sort(); save(); renderSettings(); return; }
    if (act === 'pg-weeks') { const d = UI.planForm || (UI.planForm = {}); d.goal = $('#pgGoal').value; d.goalKg = $('#pgKg').value; d.weeks = Number(a.dataset.w); UI.planResult = null; renderSettings(); return; }
    if (act === 'plan-edit') { UI.planEdit = true; UI.planResult = null; renderSettings(); return; }
    if (act === 'plan-cancel') { UI.planEdit = false; UI.planResult = null; renderSettings(); return; }
    if (act === 'plan-calc') {
      const d = UI.planForm = { goal: $('#pgGoal').value, goalKg: $('#pgKg').value, weeks: Number($('#pgWeeks').value) || 12 };
      if ((d.goal === 'cut' || d.goal === 'bulk') && !(Number(d.goalKg) > 30)) { toast('Enter your target weight.'); return; }
      UI.planResult = planMacros(d); renderSettings(); const r = document.querySelector('.plan-res'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
    }
    if (act === 'plan-use' && UI.planResult) {
      const r = UI.planResult, pr = P().profile;
      Object.assign(T, { auto: false, mode: 'plan', split: true, kcal: r.train.kcal, p: r.train.p, c: r.train.c, f: r.train.f, rest: r.rest, suggestion: null, lastCheck: todayKey(),
        plan: { goal: r.goal, goalKg: Number(r.goalKg), weeks: r.weeks, weeksNeeded: r.weeksNeeded, start: todayKey(), startKg: r.startKg, rate: r.rate, maint: r.maint, maintSource: r.maintSource } });
      const g = r.goal === 'cut' ? 'lose' : r.goal === 'bulk' ? 'gain' : 'maintain';
      if (g !== pr.goal || (r.goal !== 'maintain' && Number(r.goalKg) !== pr.goalWeightKg)) {
        pr.goal = g; if (r.goal === 'cut' || r.goal === 'bulk') pr.goalWeightKg = Number(r.goalKg);
        const l = latestWeight(); pr.goalStart = l && l.date >= addDays(todayKey(), -3) ? { date: l.date, kg: l.kg, real: true } : { date: todayKey(), kg: null };
      }
      UI.planEdit = false; UI.planResult = null; UI.tmode = null; save(); renderSettings(); toast('Plan saved. Your targets are set.'); return;
    }
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
    else if (act === 'backup-now') { try { const r = await social.backupNow(); toast(r && r.recent ? 'A backup was made in the last few minutes already.' : 'Backed up.'); loadBackupList(); } catch (e) { toast('Could not back up: ' + e.message); } }
    else if (act === 'bk-restore') {
      if (!confirm('Restore this backup? Your log goes back to how it was then, on all your devices.')) return;
      try { S = await social.restoreBackup(a.dataset.id); applyTheme(); render(); toast('Backup restored.'); } catch (e) { toast('Could not restore: ' + e.message); }
    }
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
      <div class="modal-body"><p class="muted" style="margin-top:0">GG Gains updated itself${u.from ? ' from v' + esc(u.from) : ''}. What's new:</p>
      <ul class="whatsnew">${(u.notes || []).map(n => `<li>${esc(n)}</li>`).join('') || '<li>Small fixes and improvements.</li>'}</ul></div>
      <div class="modal-foot"><button class="btn primary" data-f="close">Got it</button></div>`;
    modal.hidden = false;
    card.onclick = (e) => { if (e.target.closest('[data-f="close"]')) closeModal(); };
    if (!again) { api.update.seen(); S.lastUpdate.shown = true; }
  }

  // ---------------------------------------------------------------- start
  // ================================================================ GG GAINS: game, social and progress photos
  let GAME = null, PHOTO_DAYS = new Set(), MY_REACTS = [];
  const TIER_ICON = { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💠', diamond: '💎', elite: '🔮', legend: '👑' };
  const REACT_ICON = { fire: '🔥', muscle: '💪', gg: 'GG', laugh: '😂' };
  function game() {
    if (!GAME) GAME = window.GGGame({
      P, uid: () => (social && social.me && social.me()) || 'me', today: todayKey, dayEntries, totalsOf, targets, waterGoal, microTargets,
      garmin: k => ((P().garmin || {}).days || {})[k] || null, photoDays: () => PHOTO_DAYS, BUILTIN, weights: () => P().weights,
      goal: () => { const g = P().profile.goal || 'maintain'; return g.startsWith('lose') ? 'lose' : g; },
      firstDay: () => Object.keys(P().diary).filter(k => (P().diary[k] || []).length).sort()[0], sig: () => '', save,
      goalInfo: () => { const pg = social.progressOf ? social.progressOf(S) : {}, g = (P().profile.goal || '').startsWith('lose') ? 'lose' : P().profile.goal; if (!pg.start || pg.avg == null) return null;
        const kg = g === 'gain' ? pg.avg - pg.start.kg : pg.start.kg - pg.avg; return { pct: myPoints() || 0, kg: Math.max(0, Math.round(kg * 10) / 10) }; }
    });
    return GAME;
  }
  const gc = () => game().compute();
  const gst = () => P().game || (P().game = {});
  window.GG_PUBLIC = () => game().publicStats(gc());
  const titleHtml = id => { const t = id && game().titleById(id); if (!t) return ''; const r = game().RARITY[t.rarity]; return `<span class="ttl" style="--rc:${r.color}">${esc(t.id)}</span>`; };
  const tierBadge = (t, sm) => `<span class="tier ${sm ? 'sm' : ''}" style="--tc:${t.color}">${TIER_ICON[t.id] || ''} ${esc(t.name)}</span>`;
  const tierById = id => game().TIERS.find(t => t.id === id) || game().TIERS[0];
  // o.tier: tier id, which sets the frame (frames only come from your rank).
  function avatarHtml(o, extra = '') {
    const fr = o.tier && game().TIER_FRAMES[o.tier];
    const inner = o.avatar ? `<img src="${esc(o.avatar)}" alt="">` : esc((o.name || '?').charAt(0).toUpperCase());
    return `<span class="avatar ${o.avatar ? 'has-img' : ''} ${fr ? 'framed' : ''} ${extra}" style="background:${esc(o.color || '#E0263A')};${fr ? `--frame:${fr}` : ''}" ${o.tier ? `title="${esc(tierById(o.tier).name)} tier"` : ''}>${inner}</span>`;
  }
  if (window.MHPhotos) window.MHPhotos.days().then(s => { PHOTO_DAYS = s; game().invalidate(); if (UI.view === 'today' && modal.hidden) softRender(render); }).catch(() => {});


  // ---------------------------------------------------------------- usernames, search and country flags
  const ME = () => window.MH_ME || {};
  const flagOf = c => window.MHCountries && c ? `<span class="flag" title="${esc(window.MHCountries.nameOf(c))}">${window.MHCountries.flag(c)}</span>` : '';
  const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
  function suggestUsername() { return (P().name || 'gamer').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9_.]+/g, '').slice(0, 16) || 'gamer'; }
  // Everyone needs a unique username: shown once, right after signing in.
  function usernameGate(force) {
    const me = ME(); if (!me.id || (me.username && !force)) return;
    let checkT = null, ok = false;
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>${me.username ? 'Change your username' : 'Choose your username'}</h2>${me.username ? '<button class="btn ghost" data-u="close">Close</button>' : ''}</div>
      <div class="modal-body"><p class="muted" style="margin-top:0">Friends find you by searching your username. It has to be unique: 3–20 letters, numbers, dots or underscores.</p>
        <div class="un-in"><span>@</span><input id="unIn" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="20" value="${esc(me.username || suggestUsername())}"></div>
        <p class="small" id="unMsg">&nbsp;</p>
        <button class="btn primary" data-u="save" disabled>Save username</button></div>`;
    modal.hidden = false;
    const inp = $('#unIn'), msg = $('#unMsg'), btn = card.querySelector('[data-u="save"]');
    const check = async () => {
      const v = inp.value.trim().toLowerCase(); ok = false; btn.disabled = true;
      if (v === me.username) { msg.textContent = 'That\'s your current username.'; msg.className = 'small muted'; return; }
      if (!USERNAME_RE.test(v)) { msg.textContent = 'Use 3–20 letters, numbers, dots or underscores (no spaces).'; msg.className = 'small err'; return; }
      msg.textContent = 'Checking…'; msg.className = 'small muted';
      try { const free = await social.usernameFree(v); if (inp.value.trim().toLowerCase() !== v) return; ok = free; msg.textContent = free ? `✓ @${v} is free` : `✗ @${v} is taken. Try another.`; msg.className = 'small ' + (free ? 'ok-txt' : 'err'); btn.disabled = !free; }
      catch (e) { msg.textContent = e.offline ? 'You\'re offline. Connect to check names.' : 'Could not check: ' + e.message; msg.className = 'small err'; }
    };
    inp.addEventListener('input', () => { inp.value = inp.value.toLowerCase().replace(/\s/g, ''); clearTimeout(checkT); checkT = setTimeout(check, 350); });
    check();
    card.onclick = async e => {
      const b = e.target.closest('[data-u]'); if (!b) return;
      if (b.dataset.u === 'close') { closeModal(); return; }
      if (b.dataset.u === 'save' && ok) {
        b.disabled = true; b.textContent = 'Saving…';
        try { await social.setUsername(inp.value.trim().toLowerCase()); closeModal(); toast(`You're @${ME().username}. Friends can find you now.`); render(); }
        catch (er) { b.textContent = 'Save username'; msg.textContent = er.message; msg.className = 'small err'; ok = false; }
      }
    };
  }
  // Default flag: where the phone says you are. Change it any time in Ranked › Locker.
  function defaultCountry() {
    const me = ME(); if (!me.id || me.country || !window.MHCountries) return;
    const c = window.MHCountries.guess(); if (c) social.setCountry(c).catch(() => {});
  }
  function countrySelect(id) {
    const cur = ME().country || '';
    return `<select id="${id}"><option value="">No flag</option>${window.MHCountries.all().map(c => `<option value="${c.code}" ${c.code === cur ? 'selected' : ''}>${window.MHCountries.flag(c.code)} ${esc(c.name)}</option>`).join('')}</select>`;
  }
  const SR = { q: '', list: null, busy: false, err: '', sent: new Set() };
  function searchPanel() {
    const rel = id => { const f = (F.list || []).find(x => x.id === id); return f ? (f.status === 'accepted' ? 'friends' : f.outgoing ? 'sent' : f.incoming ? 'incoming' : '') : (SR.sent.has(id) ? 'sent' : ''); };
    return `<div class="panel" id="findPanel"><h2>Find friends</h2>
      <div class="search-row"><span class="s-ic">🔍</span><input type="search" id="uSearch" placeholder="Search a username or name" value="${esc(SR.q)}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div id="uResults">${searchResults(rel)}</div></div>`;
  }
  function searchResults(rel) {
    if (SR.err) return `<p class="small err">${esc(SR.err)}</p>`;
    if (!SR.q.trim() || SR.q.trim().length < 2) return '<p class="muted small">Type at least 2 letters of their username.</p>';
    if (SR.busy && !SR.list) return '<p class="muted small">Searching…</p>';
    if (!SR.list || !SR.list.length) return `<p class="muted small">Nobody found for “${esc(SR.q)}”.</p>`;
    return SR.list.map(u => { const r = rel(u.id); return `<div class="frow">${avatarHtml({ name: u.name, color: u.color, avatar: u.avatar })}<span class="fname">${esc(u.name)} ${flagOf(u.country)}<small class="faint">@${esc(u.username)}</small></span>
      ${r === 'friends' ? '<span class="faint small">Friends ✓</span>' : r === 'sent' ? '<span class="faint small">Request sent</span>' : r === 'incoming' ? `<button class="btn primary" data-action="f-accept" data-id="${esc(u.id)}">Accept</button>` : `<button class="btn primary" data-action="u-add" data-code="${esc(u.friend_code)}" data-id="${esc(u.id)}">Add</button>`}</div>`; }).join('');
  }
  let searchT = null;
  function wireSearch() {
    const si = $('#uSearch'); if (!si) return;
    si.addEventListener('input', () => {
      SR.q = si.value; clearTimeout(searchT);
      if (SR.q.trim().length < 2) { SR.list = null; $('#uResults').innerHTML = searchResults(() => ''); return; }
      SR.busy = true; searchT = setTimeout(async () => {
        const q = SR.q.trim();
        try { const l = await social.searchUsers(q); if (q !== SR.q.trim()) return; SR.list = l; SR.err = ''; } catch (e) { SR.err = e.offline ? 'You\'re offline.' : 'Search failed: ' + e.message; }
        SR.busy = false; const box = $('#uResults'); if (box) { const f = F.list || []; box.innerHTML = searchResults(id => { const x = f.find(y => y.id === id); return x ? (x.status === 'accepted' ? 'friends' : x.outgoing ? 'sent' : x.incoming ? 'incoming' : '') : (SR.sent.has(id) ? 'sent' : ''); }); }
      }, 300);
    });
  }
  // ---------------------------------------------------------------- local notifications (ranked events)
  function ggNotes() { return S.settings.ggNotes || (S.settings.ggNotes = []); }
  function ggNote(id, title, body, opts = {}) {
    const l = ggNotes(); if (l.some(n => n.id === id)) return;
    l.unshift({ id, kind: 'gg', title, body, created_at: new Date().toISOString(), read: false });
    l.splice(40); save(); mergeNotes();
    if (!opts.quiet) toast(title + (body ? ' · ' + body : ''), 'View', () => nav('friends'));
  }
  let SERVER_NOTES = [];
  function mergeNotes() {
    const list = [...SERVER_NOTES, ...ggNotes()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    NOTES = { list, unread: list.filter(n => !n.read).length }; renderMe();
  }

  // ---------------------------------------------------------------- ladder rows
  function ggRows() {
    const c = gc(), wk = c.wk, lastWk = game().addD(wk, -7), rows = rankingRows();
    for (const r of rows) {
      if (r.me) { r.st = game().publicStats(c); r.avatar = P().avatar || null; }
      else { try { r.st = r.friend.profile.game ? JSON.parse(r.friend.profile.game) : null; } catch (_) { r.st = null; } r.avatar = r.friend.profile.avatar || null; }
      const st = r.st || {};
      r.week = st.wk === wk ? st.wp || 0 : 0;
      r.lastWeek = st.lwk === lastWk ? st.lwp || 0 : st.wk === lastWk ? st.wp || 0 : 0;
      r.season = st.s === c.season ? st.sp || 0 : 0;
      r.tier = tierById(st.t); r.level = st.lv || 1; r.fire = !!st.fire; r.title = st.ti || '';
      r.country = r.me ? ME().country : (r.friend.profile.country || null); r.username = r.me ? ME().username : r.friend.profile.username;
      r.hideWeight = !!st.hw;
    }
    const mvp = rows.length > 1 ? rows.slice().sort((a, b) => b.lastWeek - a.lastWeek)[0] : null;
    if (mvp && mvp.lastWeek > 0) mvp.crown = true;
    return rows;
  }
  function sortedFor(tab, rows) {
    const key = tab === 'week' ? 'week' : tab === 'season' ? 'season' : 'points';
    return rows.slice().sort((a, b) => (b[key] ?? -1e9) - (a[key] ?? -1e9));
  }
  function weekRank() {
    const rows = sortedFor('week', ggRows()); if (rows.length < 2) return null;
    const i = rows.findIndex(r => r.me); return { pos: i + 1, of: rows.length, above: rows[i - 1] || null, me: rows[i] };
  }
  // Arrows: change since the first time you looked at the ladder today.
  function arrowsFor(tab, list) {
    const snap = S.settings.ladderSnap || (S.settings.ladderSnap = {});
    const day = todayKey();
    if (!snap[tab] || snap[tab].day !== day) { snap[tab] = { day, pos: Object.fromEntries(list.map((r, i) => [r.id, i + 1])) }; save(); }
    return id => { const was = snap[tab].pos[id], now = list.findIndex(r => r.id === id) + 1; if (!was || was === now) return ''; return was > now ? `<span class="rk-mv up">▲${was - now}</span>` : `<span class="rk-mv down">▼${now - was}</span>`; };
  }
  function ggLadderPanel() {
    const tab = UI.rk || 'week', c = gc(), rows = ggRows();
    const tabs = [['week', 'This week'], ['season', `Season ${c.season}`], ['overall', 'Overall'], ['me', 'My rank'], ['locker', 'Locker']];
    const head = `<div class="rk-tabs">${tabs.map(([v, l]) => `<button class="${tab === v ? 'on' : ''}" data-action="rk-tab" data-v="${v}">${l}</button>`).join('')}</div>`;
    if (tab === 'me') return `<div class="panel">${head}${myRankHtml(c)}</div>`;
    if (tab === 'locker') return `<div class="panel">${head}${lockerHtml(c)}</div>`;
    const list = sortedFor(tab, rows), arrow = arrowsFor(tab, list);
    const val = r => tab === 'week' ? r.week : tab === 'season' ? r.season : r.points;
    const meRow = list.find(r => r.me), others = list.filter(r => !r.me);
    let rival = '';
    if (tab === 'week' && others.length) {
      const rv = others.slice().sort((a, b) => Math.abs(a.week - meRow.week) - Math.abs(b.week - meRow.week))[0];
      const gap = rv.week - meRow.week;
      rival = `<div class="rival">⚔️ This week's rival: <b>${esc(rv.name)}</b> · ${gap > 0 ? `${fmt(gap)} CP ahead of you` : gap < 0 ? `${fmt(-gap)} CP behind you` : 'level with you'}</div>`;
    }
    const sub = tab === 'week' ? `Consistency points (CP) this week. Resets every Monday. Earn CP for logging, hitting calories and protein, steps, training, water, weigh-ins, your progress photo and quests.` :
      tab === 'season' ? `Season ${c.season} runs ${esc(shortDate(c.seasonStart))} to ${esc(shortDate(c.seasonEnd))}. Your final season tier is kept as a badge.` :
      'How far each person has got from their start weight to their goal (7-day average weight).';
    const leader = Math.max(1, ...list.map(r => val(r) || 0));
    return `<div class="panel">${head}<p class="muted small" style="margin:6px 0 10px">${sub}</p>${rival}
      <ol class="rank gg-rank">${list.map((r, i) => `<li class="${r.me ? 'me' : ''}" ${r.friend ? `data-action="f-view" data-id="${esc(r.id)}"` : ''}>
        <span class="rk-pos num">${i + 1}${arrow(r.id)}</span>${avatarHtml({ name: r.name, color: r.color, avatar: r.avatar, tier: r.tier.id })}
        <span class="rk-name"><span class="rk-line"><span style="color:${esc(r.color || 'inherit')}">${esc(r.name)}</span> ${flagOf(r.country)}${r.crown ? ' <span title="Last week\'s MVP">👑</span>' : ''}${r.fire ? ' <span title="On fire: 3 great days in a row">🔥</span>' : ''}${r.me ? ' <span class="faint">(you)</span>' : ''}</span>
          <small>${tierBadge(r.tier, true)} · Lv ${fmt(r.level)}${r.title ? ' · ' + titleHtml(r.title) : ''}</small></span>
        <span class="rk-pts num">${tab === 'overall' ? pointsText(r.points) : fmt(val(r) || 0) + ' CP'}</span>
        ${tab === 'overall' ? '' : `<div class="rk-prog rk-cp"><div class="rk-track"><i style="width:${Math.max(2, (val(r) || 0) / leader * 100)}%"></i></div></div>`}
        ${r.hideWeight && !r.me ? '<div class="faint small rk-hidden">Weight hidden · ' + esc(pointsText(r.points)) + ' to goal</div>' : progressBar(r)}
      </li>`).join('')}</ol>
      ${!others.length ? '<p class="muted small">Find friends below (or tap 🔍) to start competing.</p>' : ''}</div>`;
  }
  function myRankHtml(c) {
    const g = gst(), nx = c.next;
    const dropTo = game().TIERS[game().TIERS.indexOf(c.tier) - 1];
    const lvPct = c.need ? c.into / c.need * 100 : 100;
    const tierPct = nx ? (c.rating - c.tier.min) / (nx.min - c.tier.min) * 100 : 100;
    const wq = c.weekly, wqClaimed = (g.weeklyDone || []).includes(c.wk);
    const badges = (g.badges || []).map(id => (game().EVENTS.find(e => e.id === id) || { name: id }).name);
    return `<div class="myrank">
      <div class="mr-top">${avatarHtml({ name: P().name, color: P().color, avatar: P().avatar, tier: c.tier.id }, 'big')}
        <div><div class="mr-name" style="color:${esc(P().color)}">${esc(P().name)} ${flagOf(ME().country)}</div>${ME().username ? `<div class="faint small">@${esc(ME().username)}</div>` : ''}<div class="small">${(g.equipped || {}).title ? titleHtml(g.equipped.title) : '<span class="faint">No title equipped: earn them in the Locker</span>'}</div></div></div>
      <div class="mr-block"><div class="mr-h"><b>Level ${c.level}</b><span class="faint small">${c.need ? `${fmt(c.into)} / ${fmt(c.need)} XP` : 'Max level'}</span></div><div class="xpbar"><i style="width:${lvPct}%"></i></div><div class="faint small">XP never goes down. Every consistency point you earn is also XP. ${fmt(c.titlesEarned.size)} of ${game().TITLES.length} titles earned.</div></div>
      <div class="mr-block"><div class="mr-h">${tierBadge(c.tier)}<span class="faint small">${fmt(c.rating)} CP in the last 14 days</span></div><div class="xpbar tierbar" style="--tc:${c.tier.color}"><i style="width:${tierPct}%"></i></div>
        <div class="faint small">${nx ? `${fmt(nx.min - c.rating)} CP to ${TIER_ICON[nx.id]} ${esc(nx.name)}.` : 'Top tier. Stay here!'}${dropTo && c.rating - c.tier.min < 60 ? ` <b class="warn-txt">Careful: ${fmt(c.rating - c.tier.min)} CP above ${esc(dropTo.name)}. A couple of bad days and you drop.</b>` : ''} Your tier uses your last 14 days, so it can go up or down.</div></div>
      <div class="mr-stats"><div><b>🔥 ${fmt(c.logStreak)}</b><span>day logging streak</span></div><div><b>💪 ${fmt(c.protStreak)}</b><span>day protein streak</span></div><div><b>🧊 ${fmt(c.freezes)}</b><span>streak freezes</span></div><div><b>${fmt(c.weekPts)}</b><span>CP this week</span></div></div>
      <div class="mr-block"><div class="mr-h"><b>Weekly quest</b><span class="faint small">+150 XP and a streak freeze</span></div><div>${esc(wq.text)}: <b>${fmt(Math.min(wq.have, wq.need))} / ${wq.need}</b></div>
        ${wq.done ? (wqClaimed ? '<div class="faint small">✅ Claimed</div>' : '<button class="btn primary" data-action="gg-claim-week">Claim reward</button>') : `<div class="xpbar"><i style="width:${wq.have / wq.need * 100}%"></i></div>`}</div>
      ${c.events.map(e => `<div class="mr-block event"><div class="mr-h"><b>${esc(e.name)}</b><span class="faint small">${esc(shortDate(e.from))} – ${esc(shortDate(e.to))}</span></div>
        <div>${esc(e.text)}${e.live ? `: <b>${fmt(Math.min(e.have, e.need))} / ${e.need}</b>` : ' · starts soon'}</div>
        ${(g.badges || []).includes(e.id) ? '<div class="faint small">🏅 Badge earned</div>' : e.done ? '<button class="btn primary" data-action="gg-claim-event" data-id="' + e.id + '">Claim badge + 250 XP</button>' : e.live ? `<div class="xpbar"><i style="width:${e.have / e.need * 100}%"></i></div><div class="faint small">Limited time: this badge can't be earned after the event.</div>` : ''}</div>`).join('')}
      ${badges.length ? `<div class="mr-block"><b>Badges</b><div class="chips" style="margin-top:6px">${badges.map(b => `<span class="chip on">🏅 ${esc(b)}</span>`).join('')}</div></div>` : ''}
      <label class="check" style="margin-top:12px"><input type="checkbox" data-action="gg-hidew" ${g.hideWeight ? 'checked' : ''}> Hide my weight from friends (compete on habits only)</label>
      <p class="faint small">Fair play: eating far below your target or losing weight faster than about 1% of your body weight a week earns no extra CP. Consistency wins.</p>
    </div>`;
  }
  function lockerHtml(c) {
    const g = gst(), eq = g.equipped || {};
    return `<div class="locker">
      <div class="lk-sec"><b>Profile picture</b><div class="lk-av">${avatarHtml({ name: P().name, color: P().color, avatar: P().avatar, tier: c.tier.id }, 'big')}
        <label class="btn">Choose a photo<input type="file" accept="image/*" hidden data-action="gg-avatar-file"></label>${P().avatar ? '<button class="btn ghost" data-action="gg-avatar-remove">Remove</button>' : ''}</div>
        <div class="faint small">Friends see it on the ladder. It's shrunk to a tiny image so the app stays light.</div></div>
      <div class="lk-sec"><b>Username and flag</b><div class="lk-av"><span>${ME().username ? '@' + esc(ME().username) : '<span class="faint">No username yet</span>'}</span><button class="btn ghost sm" data-action="u-change">Change</button></div>
        <label class="field" style="margin-top:6px"><span>Country flag next to your name</span>${countrySelect('ctySel')}</label></div>
      <div class="lk-sec"><b>Frame</b><div class="faint small" style="margin-top:4px">Your frame is your rank: ${tierBadge(c.tier, true)}. Climb to a higher tier to get its frame, and drop a tier and the frame drops with you.</div>
        <div class="lk-tiers">${game().TIERS.map(t => `<span class="${t.id === c.tier.id ? 'on' : ''}">${avatarHtml({ name: P().name, color: P().color, avatar: P().avatar, tier: t.id })}<small>${esc(t.name)}</small></span>`).join('')}</div></div>
      <div class="lk-sec"><b>Titles</b> <span class="faint small">${fmt(c.titlesEarned.size)} / ${game().TITLES.length} earned · tap one you've earned to wear it</span>
        ${Object.entries(game().RARITY).map(([rid, r]) => `<div class="ttl-group"><div class="ttl-h" style="color:${r.color}">${esc(r.name)}</div><div class="ttl-grid">${game().TITLES.filter(t => t.rarity === rid).map(t => {
          const got = c.titlesEarned.has(t.id), have = Math.min(t.need, Math.floor(c.stats[t.stat] || 0));
          return got ? `<button class="ttl-card got ${(eq.title || '') === t.id ? 'on' : ''}" style="--rc:${r.color}" data-action="gg-equip" data-kind="title" data-id="${esc(t.id)}"><b>✓ ${esc(t.id)}</b><small>${esc(t.text)}</small>${(eq.title || '') === t.id ? '<i>Wearing</i>' : ''}</button>`
            : `<div class="ttl-card" style="--rc:${r.color}"><b>🔒 ${esc(t.id)}</b><small>${esc(t.text)}</small>${t.need > 1 ? `<div class="xpbar sm"><i style="width:${have / t.need * 100}%"></i></div><small>${fmt(have)} / ${fmt(t.need)}</small>` : ''}</div>`;
        }).join('')}</div></div>`).join('')}
        ${eq.title ? '<button class="btn ghost sm" style="margin-top:10px" data-action="gg-equip" data-kind="title" data-id="">Take title off</button>' : ''}</div>
      <p class="faint small">Titles reward consistency over time and big goals: the cooler the title, the harder it is. Your name colour is picked at random.</p></div>`;
  }
  // ---------------------------------------------------------------- diary card and result screen
  function gameCard(k) {
    const c = gc(), d = c.days[k]; if (!d) return '';
    if (c.newTitles.length) setTimeout(() => c.newTitles.forEach(t => ggNote('title-' + t.id, `🏷️ New title: ${t.id}`, `${game().RARITY[t.rarity].name} · ${t.text}. Wear it from Ranked › Locker.`)), 0);
    const isT = k === c.today, gr = game().gradeOf(d.pts);
    const reacts = MY_REACTS.filter(r => r.day === k);
    const who = id => { const f = (F.list || []).find(x => x.id === id); return f ? f.profile.name : 'A friend'; };
    return `<div class="panel gg-card">
      <div class="gg-row1">
        <button class="gg-score" data-action="gg-result" data-k="${k}"><b class="num">${fmt(d.pts)}</b><span>CP${isT ? ' today' : ''}</span><i class="grade g-${gr}">${gr}</i></button>
        <div class="gg-meta">${tierBadge(c.tier)}<span class="lv">Lv ${fmt(c.level)}</span>${c.logStreak ? `<span class="streak" title="Logging streak">🔥 ${fmt(c.logStreak)}</span>` : ''}${c.freezes ? `<span class="frz" title="Streak freezes">🧊 ${fmt(c.freezes)}</span>` : ''}</div>
      </div>
      ${d.mult === 2 ? '<div class="gg-banner">⚡ Welcome back! Comeback bonus: double CP.</div>' : ''}
      ${isT ? `<div class="gg-quests"><div class="faint small">Today's quests · +10 each</div>${d.quests.map(q => `<div class="q ${q.ok ? 'ok' : ''}"><span>${q.ok ? '✅' : '⬜'} ${esc(q.text)}</span><small>${esc(q.prog || '')}</small></div>`).join('')}</div>` : ''}
      ${reacts.length ? `<div class="gg-reacts">${reacts.map(r => `<span title="${esc(who(r.from_id))}">${REACT_ICON[r.emoji] || ''} ${esc(who(r.from_id))}</span>`).join('')}</div>` : ''}
      <div class="gg-actions"><button class="btn ghost" data-action="go-ranked">Ranked · ${fmt(c.weekPts)} CP this week ›</button></div>
    </div>`;
  }
  function shareText(t) { if (navigator.share) navigator.share({ text: t }).catch(() => {}); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('Copied to share.'); } }
  function showResult(k) {
    const c = gc(), d = c.days[k]; if (!d) return;
    const gr = game().gradeOf(d.pts), best = d.items.filter(i => i.ok).sort((a, b) => (b.pts - a.pts) || ((['logged', 'weigh'].includes(a.id) ? 1 : 0) - (['logged', 'weigh'].includes(b.id) ? 1 : 0)))[0];
    const rk = weekRank(), prev = (S.settings.lastRank || {}).pos;
    card.className = 'modal-card narrow gg-result';
    card.innerHTML = `<div class="modal-head"><h2>${k === todayKey() ? 'Today' : esc(shortDate(k))}: result</h2><button class="btn ghost" data-r="close">Close</button></div>
      <div class="modal-body">
        <div class="res-grade g-${gr}">${gr}</div>
        <div class="res-pts"><b class="num">${fmt(d.pts)}</b> consistency points${d.mult === 2 ? ' · ⚡ x2 comeback' : ''}${d.streakBonus ? ` · 🔥 +${d.streakBonus} streak bonus` : ''}</div>
        ${best ? `<div class="res-mvp">⭐ MVP stat: ${esc(best.label.replace('Quest: ', ''))}${best.note ? ` <span class="faint">(${esc(best.note)})</span>` : ''}</div>` : ''}
        ${rk ? `<div class="res-rank">Weekly ladder: <b>#${rk.pos}</b> of ${rk.of}${prev && prev !== rk.pos ? ` <span class="${prev > rk.pos ? 'up' : 'down'}">${prev > rk.pos ? '▲' : '▼'} ${Math.abs(prev - rk.pos)}</span>` : ''}${rk.above ? ` · ${fmt(rk.above.week - rk.me.week)} CP behind ${esc(rk.above.name)}` : ' · you\'re top 👑'}</div>` : ''}
        ${d.tooLow ? '<div class="sup-warn"><p>⚠ You ate well under your target today. Under-eating earns no CP: fuel up tomorrow.</p></div>' : ''}
        <ul class="res-list">${d.items.map(i => `<li class="${i.ok ? 'ok' : ''}"><span>${i.ok ? '✅' : '▫️'} ${esc(i.label)}</span><b>${i.ok ? '+' + i.pts : '0'}</b></li>`).join('')}</ul>
        <div class="res-btns"><button class="btn" data-r="share">Share</button></div>
      </div>`;
    modal.hidden = false;
    card.onclick = e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'close') { closeModal(); render(); }
      if (b.dataset.r === 'share') shareText(`GG Gains · ${k === todayKey() ? 'today' : shortDate(k)}: grade ${gr}, ${d.pts} CP${c.logStreak ? `, 🔥 ${c.logStreak}-day streak` : ''}. ${c.tier.name} tier, level ${c.level}. Beat that 😤`);
    };
    if (rk) { S.settings.lastRank = { pos: rk.pos, at: todayKey() }; save(); }
  }
  function equip(kind, id) { const g = gst(); g.equipped = g.equipped || {}; g.equipped[kind] = id || null; save(); }

  // ---------------------------------------------------------------- ranked events -> notifications
  async function ggCheckEvents() {
    if (!F.list) return;
    const c = gc(), g = gst(), today = todayKey(), now = new Date();
    const list = sortedFor('week', ggRows()), ids = list.map(r => r.id), meI = ids.indexOf('me');
    const prev = S.settings.ladderOrder;
    if (prev && prev.wk === c.wk && meI >= 0) {
      for (const r of list) {
        if (r.me) continue;
        const pi = prev.ids.indexOf(r.id), pm = prev.ids.indexOf('me'), ni = ids.indexOf(r.id);
        if (pi < 0 || pm < 0) continue;
        if (pi > pm && ni < meI) ggNote(`ot-${today}-${r.id}`, `${r.name} overtook you 😤`, `You're ${fmt(r.week - list[meI].week)} CP behind this week.`);
        if (pi < pm && ni > meI) ggNote(`yo-${today}-${r.id}`, `You overtook ${r.name} 🔥`, `${fmt(list[meI].week - r.week)} CP ahead this week.`);
      }
    }
    S.settings.ladderOrder = { wk: c.wk, ids };
    // tier changes and near rank-up
    const lt = S.settings.lastTier;
    if (lt && lt !== c.tier.id) {
      const up = game().TIERS.findIndex(t => t.id === c.tier.id) > game().TIERS.findIndex(t => t.id === lt);
      ggNote(`tier-${today}-${c.tier.id}`, up ? `Rank up! ${TIER_ICON[c.tier.id]} ${c.tier.name}` : `Dropped to ${c.tier.name}`, up ? 'Keep it going to climb higher.' : 'A couple of good days gets you back.');
    }
    S.settings.lastTier = c.tier.id;
    if (c.next && c.next.min - c.rating <= 40 && c.next.min - c.rating > 0) ggNote(`near-${today}`, `You're 1 good day away from ${c.next.name}`, `${fmt(c.next.min - c.rating)} CP to go.`, { quiet: true });
    // Sunday evening: last day of the week
    if (now.getDay() === 0 && now.getHours() >= 17 && list.length > 1) {
      const above = list[meI - 1];
      ggNote(`sun-${c.wk}`, `Final day of the week: you're #${meI + 1}`, above ? `${fmt(above.week - list[meI].week)} CP behind ${above.name}. Finish strong!` : 'You\'re top. Hold on to it! 👑');
    }
    // Monday: last week's MVP
    if (now.getDay() === 1 && list.length > 1) {
      const mvp = list.slice().sort((a, b) => b.lastWeek - a.lastWeek)[0];
      if (mvp && mvp.lastWeek > 0) ggNote(`mvp-${game().addD(c.wk, -7)}`, mvp.me ? 'You were last week\'s MVP 👑' : `${mvp.name} was last week's MVP 👑`, `${fmt(mvp.lastWeek)} CP. A new week starts now.`);
    }
    // invite rewards: +100 XP for each new friend, a frame at 3 friends
    const nf = (F.list || []).filter(f => f.status === 'accepted').length;
    if (nf > (g.friendsRewarded || 0)) {
      const gained = nf - (g.friendsRewarded || 0);
      g.bonusXp = (g.bonusXp || 0) + gained * 100; g.friendsRewarded = nf;
      game().invalidate(); save();
      ggNote(`inv-${nf}`, `+${gained * 100} XP for your squad`, 'Every friend you add earns XP.', { quiet: true });
    }
    // reactions on my days
    try {
      const rs = await social.reactionsFor(social.me(), game().addD(today, -14));
      MY_REACTS = rs;
      const seen = S.settings.reactSeen || '';
      const fresh = rs.filter(r => r.created_at > seen && r.from_id !== social.me());
      if (fresh.length) {
        S.settings.reactSeen = rs[0].created_at;
        const f = (F.list || []).find(x => x.id === fresh[0].from_id);
        ggNote(`re-${fresh[0].created_at}`, `${f ? f.profile.name : 'A friend'} reacted ${REACT_ICON[fresh[0].emoji]} to your day`, fresh.length > 1 ? `+${fresh.length - 1} more reactions` : '');
        if (UI.view === 'today' && modal.hidden) softRender(render);
      }
    } catch (_) {}
  }

  // ---------------------------------------------------------------- reactions on a friend's day
  let FR_REACTS = { key: '', list: [] };
  function reactBar(f, day) {
    const key = f.id + '|' + day;
    if (FR_REACTS.key !== key) { FR_REACTS = { key, list: [], loading: true }; social.reactionsFor(f.id, day, day).then(l => { if (FR_REACTS.key === key) { FR_REACTS.list = l; FR_REACTS.loading = false; if (UI.view === 'friends' && F.view === f.id) renderFriendProfile(); } }).catch(() => {}); }
    const mine = new Set(FR_REACTS.list.filter(r => r.from_id === social.me()).map(r => r.emoji));
    const count = e => FR_REACTS.list.filter(r => r.emoji === e).length;
    return `<div class="react-bar"><span class="faint small">React to ${esc(f.profile.name)}'s day</span>${Object.entries(REACT_ICON).map(([e, ic]) => `<button class="react ${mine.has(e) ? 'on' : ''}" data-action="react" data-e="${e}" data-to="${esc(f.id)}" data-day="${day}">${ic}${count(e) ? ` <b>${count(e)}</b>` : ''}</button>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- profile picture
  async function setAvatarFrom(file) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 160;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160);
    let url = c.toDataURL('image/webp', 0.8); if (!url.startsWith('data:image/webp')) url = c.toDataURL('image/jpeg', 0.8);
    P().avatar = url; save(); render(); toast('Profile picture updated.');
  }

  // ---------------------------------------------------------------- progress photos
  async function photoThumbs(root = main) {
    for (const el of root.querySelectorAll('[data-photo]')) {
      if (el.dataset.loaded) continue; el.dataset.loaded = '1';
      try { const r = await window.MHPhotos.get(el.dataset.photo); if (r && r.blob) { const u = URL.createObjectURL(r.blob); if (el.tagName === 'IMG') el.src = u; else el.style.backgroundImage = `url(${u})`; } } catch (_) {}
    }
  }
  function photoCard(k) {
    if (!window.MHPhotos) return '';
    const has = PHOTO_DAYS.has(k);
    return `<div class="panel photo-card"><div class="pc-head"><h2>📸 Progress photo</h2><button class="btn ghost sm" data-action="go-photos">All photos ›</button></div>
      ${has ? `<div class="pc-row"><img data-photo="${k}" alt="Progress photo for ${esc(shortDate(k))}"><div><p class="muted small" style="margin-top:0">Saved on this phone only.</p><button class="btn" data-action="photo-take" data-k="${k}">Retake</button></div></div>`
        : `<p class="muted small" style="margin-top:0">Take one photo a day (+10 CP), in the same spot and pose. GG Gains turns them into a transformation video.</p><button class="btn primary" data-action="photo-take" data-k="${k}">Take today's photo</button>`}</div>`;
  }
  async function takePhoto(k) {
    const keys = [...PHOTO_DAYS].filter(x => x < k).sort(); let ghost = null;
    if (keys.length) { const r = await window.MHPhotos.get(keys[keys.length - 1]); if (r) ghost = URL.createObjectURL(r.blob); }
    const blob = await window.MHPhotos.capture({ ghost });
    if (!blob) return;
    await window.MHPhotos.put(k, blob); PHOTO_DAYS.add(k); game().invalidate(); save(); render(); toast('Photo saved on this phone.');
  }
  const PH = { range: 'month', music: 'beat', file: null, speed: 'normal', labels: 'weight', size: 'portrait', busy: false, progress: 0, video: null, view: null };
  function renderPhotos() {
    const ks = [...PHOTO_DAYS].sort(), byMonth = {};
    for (const k of ks) (byMonth[k.slice(0, 7)] = byMonth[k.slice(0, 7)] || []).push(k);
    const months = Object.keys(byMonth).sort().reverse();
    const mName = m => dateOf(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const ranges = [['month', 'This month'], ['last', 'Last month'], ['year', 'This year'], ['all', 'All time'], ...months.map(m => ['m:' + m, mName(m)])];
    main.innerHTML = `<div class="page">
      <div class="page-head"><div><h1>Transformation</h1><p class="sub">${ks.length} photo${ks.length === 1 ? '' : 's'} · stored only on this device</p></div><button class="btn primary" data-action="photo-take" data-k="${todayKey()}">📸 Today's photo</button></div>
      <div class="grid-2">
        <div class="panel"><h2>Make a video</h2>
          ${!window.MHPhotos.supported() ? '<p class="err small">This browser can\'t make videos. Update iOS, or use the PC app.</p>' : ''}
          <label class="field"><span>Photos from</span><select id="phRange">${ranges.map(([v, l]) => `<option value="${v}" ${PH.range === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
          <label class="field" style="margin-top:10px"><span>Music</span><select id="phMusic"><option value="beat" ${PH.music === 'beat' ? 'selected' : ''}>GG Gains beat (built in)</option><option value="file" ${PH.music === 'file' ? 'selected' : ''}>A song from my phone…</option><option value="none" ${PH.music === 'none' ? 'selected' : ''}>No music</option></select></label>
          ${PH.music === 'file' ? `<label class="btn" style="margin-top:8px">${PH.file ? '🎵 ' + esc(PH.file.name) : 'Choose a song'}<input type="file" accept="audio/*" hidden id="phFile"></label>` : ''}
          <div class="form-grid ph-opts" style="margin-top:10px">
            <label class="field"><span>Speed</span><select id="phSpeed">${[['fast', 'Fast'], ['normal', 'Normal'], ['slow', 'Slow']].map(([v, l]) => `<option value="${v}" ${PH.speed === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Captions</span><select id="phLabels"><option value="weight" ${PH.labels === 'weight' ? 'selected' : ''}>Date + weight</option><option value="date" ${PH.labels === 'date' ? 'selected' : ''}>Date only</option></select></label>
            <label class="field"><span>Shape</span><select id="phSize"><option value="portrait" ${PH.size === 'portrait' ? 'selected' : ''}>Post 4:5</option><option value="story" ${PH.size === 'story' ? 'selected' : ''}>Story 9:16</option></select></label></div>
          <button class="btn primary" style="margin-top:12px" data-action="photos-make" ${PH.busy ? 'disabled' : ''}>${PH.busy ? 'Making your video…' : '🎬 Make my video'}</button>
          ${PH.busy ? `<div class="xpbar" style="margin-top:10px"><i style="width:${Math.round(PH.progress * 100)}%"></i></div><p class="faint small">Keep the app open while it records (it plays in real time).</p>` : ''}
          ${PH.video ? `<video class="ph-video" src="${PH.video.url}" controls playsinline></video><div class="res-btns"><button class="btn primary" data-action="photos-share">Share / save</button><a class="btn" href="${PH.video.url}" download="GG-Gains-transformation.${PH.video.ext}">Download</a></div>` : ''}
          <p class="faint small" style="margin-top:12px">Photos never leave this device: they aren't uploaded anywhere. Deleting the app or clearing Safari's website data deletes them too, so save your videos.</p>
        </div>
        <div class="panel"><h2>Your photos</h2>
          ${months.length ? months.map(m => `<div class="ph-month"><b>${esc(mName(m))}</b> <span class="faint small">${byMonth[m].length} photos</span><div class="ph-grid">${byMonth[m].map(k => `<button class="ph-th" data-photo="${k}" data-action="photo-view" data-k="${k}"><span>${esc(String(Number(k.slice(8))))}</span></button>`).join('')}</div></div>`).join('') : '<p class="muted">No photos yet. Take your first one today: future you will thank you.</p>'}
        </div>
      </div></div>`;
    photoThumbs();
    const bind = (id, key, re) => { const el = $('#' + id); if (el) el.addEventListener('change', () => { PH[key] = el.value; if (re) renderPhotos(); }); };
    bind('phRange', 'range'); bind('phMusic', 'music', true); bind('phSpeed', 'speed'); bind('phLabels', 'labels'); bind('phSize', 'size');
    const pf = $('#phFile'); if (pf) pf.addEventListener('change', () => { PH.file = pf.files[0] || null; renderPhotos(); });
  }
  async function makeTransformation() {
    const today = todayKey(), y = today.slice(0, 4), m = today.slice(0, 7);
    const lm = (() => { const d = dateOf(m + '-01'); d.setMonth(d.getMonth() - 1); return keyOf(d).slice(0, 7); })();
    let from = null, to = null, title = 'My transformation', subtitle = '';
    const mName = mm => dateOf(mm + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (PH.range === 'month') { from = m + '-01'; to = m + '-31'; subtitle = mName(m); }
    else if (PH.range === 'last') { from = lm + '-01'; to = lm + '-31'; subtitle = mName(lm); }
    else if (PH.range === 'year') { from = y + '-01-01'; to = y + '-12-31'; subtitle = y; title = 'My year'; }
    else if (PH.range.startsWith('m:')) { const mm = PH.range.slice(2); from = mm + '-01'; to = mm + '-31'; subtitle = mName(mm); }
    else subtitle = 'All time';
    const photos = await window.MHPhotos.list(from, to);
    if (photos.length < 2) { toast('You need at least 2 photos in that period.'); return; }
    if (PH.music === 'file' && !PH.file) { toast('Choose a song first, or pick the built-in beat.'); return; }
    const per = { fast: 0.18, normal: 0.32, slow: 0.6 }[PH.speed] * (photos.length > 120 ? 0.6 : 1);
    const w = P().weights, wk = Object.keys(w).sort();
    const wAt = k => { let v = null; for (const x of wk) { if (x <= k) v = w[x]; else break; } return v; };
    const labels = k => shortDate(k) + (PH.labels === 'weight' && wAt(k) != null ? ` · ${fmt(wAt(k), 1)} kg` : '');
    const w0 = wAt(photos[0].k), w1 = wAt(photos[photos.length - 1].k);
    const endText = w0 != null && w1 != null && Math.abs(w1 - w0) >= 0.1 ? `${w1 < w0 ? '−' : '+'}${fmt(Math.abs(w1 - w0), 1)} kg · ${photos.length} days` : `${photos.length} days of work`;
    PH.busy = true; PH.progress = 0; if (PH.video) URL.revokeObjectURL(PH.video.url); PH.video = null; renderPhotos();
    try {
      const out = await window.MHPhotos.makeVideo({ photos, title, subtitle, perPhoto: per, music: PH.music === 'beat' ? 'beat' : PH.music === 'file' ? PH.file : null, labels, endText, size: PH.size === 'story' ? [1080, 1920] : [1080, 1350] },
        p => { PH.progress = p; const bar = main.querySelector('.xpbar i'); if (bar) bar.style.width = Math.round(p * 100) + '%'; });
      PH.video = { url: URL.createObjectURL(out.blob), blob: out.blob, ext: out.ext };
      toast('Your video is ready.');
    } catch (e) { toast('Could not make the video: ' + e.message); }
    PH.busy = false; if (UI.view === 'photos') renderPhotos();
  }
  async function viewPhoto(k) {
    const r = await window.MHPhotos.get(k); if (!r) return;
    const u = URL.createObjectURL(r.blob);
    card.className = 'modal-card narrow';
    card.innerHTML = `<div class="modal-head"><h2>${esc(longDate(k))}</h2><button class="btn ghost" data-v="close">Close</button></div><div class="modal-body"><img class="ph-full" src="${u}" alt=""><div class="res-btns"><button class="btn" data-v="retake">Retake</button><button class="btn danger" data-v="del">Delete</button></div></div>`;
    modal.hidden = false;
    card.onclick = async e => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      if (b.dataset.v === 'close') closeModal();
      if (b.dataset.v === 'retake') { closeModal(); takePhoto(k); }
      if (b.dataset.v === 'del') { if (!confirm('Delete this photo? It can\'t be undone.')) return; await window.MHPhotos.del(k); PHOTO_DAYS.delete(k); game().invalidate(); closeModal(); render(); }
    };
  }

  // ---------------------------------------------------------------- actions
  async function ggAction(act, a, e) {
    const g = gst();
    if (act === 'go-ranked') { UI.rk = UI.rk || 'week'; nav('friends'); return true; }
    if (act === 'go-photos') { nav('photos'); return true; }
    if (act === 'rk-tab') { UI.rk = a.dataset.v; render(); return true; }
    if (act === 'gg-result') { showResult(a.dataset.k); return true; }
    if (act === 'gg-claim-week') { if (game().claimWeekly(gc().weekly, gc().wk)) toast('+150 XP and a streak freeze 🧊'); render(); return true; }
    if (act === 'gg-claim-event') { const ev = gc().events.find(x => x.id === a.dataset.id); if (ev && game().claimEvent(ev)) toast('🏅 Badge earned! +250 XP'); render(); return true; }
    if (act === 'gg-equip') { if (a.dataset.id && !gc().titlesEarned.has(a.dataset.id)) return true; equip('title', a.dataset.id); render(); return true; }
    if (act === 'gg-hidew') { g.hideWeight = a.checked; save(); toast(a.checked ? 'Your weight is hidden from friends.' : 'Friends can see your weight again.'); return true; }
    if (act === 'gg-avatar-remove') { P().avatar = null; save(); render(); return true; }
    if (act === 'react') {
      const on = !a.classList.contains('on');
      a.classList.toggle('on', on);
      try { await social.react(a.dataset.to, a.dataset.day, a.dataset.e, on); FR_REACTS.key = ''; if (on) toast(`Sent ${REACT_ICON[a.dataset.e]}`); renderFriendProfile(); }
      catch (err) { a.classList.toggle('on', !on); toast(err.offline ? 'You\'re offline.' : 'Could not send that reaction.'); }
      return true;
    }
    if (act === 'photo-take') { takePhoto(a.dataset.k); return true; }
    if (act === 'photo-view') { viewPhoto(a.dataset.k); return true; }
    if (act === 'photos-make') { makeTransformation(); return true; }
    if (act === 'photos-share') {
      const v = PH.video; if (!v) return true;
      const file = new File([v.blob], `GG-Gains-transformation.${v.ext}`, { type: v.blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'My GG Gains transformation' }).catch(() => {});
      else { const l = document.createElement('a'); l.href = v.url; l.download = file.name; l.click(); }
      return true;
    }
    return false;
  }
  main.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset && t.dataset.action === 'gg-avatar-file' && t.files && t.files[0]) setAvatarFrom(t.files[0]).catch(() => toast('Could not read that picture.'));
  });

  render();
  setTimeout(() => { defaultCountry(); usernameGate(); }, 400);
  // Quietly bring in the latest Garmin days when the app opens, then every 3 hours.
  const connectedPids = () => Object.values(S.profiles).filter(p => p.garmin.displayName || p.garmin.lastSync).map(p => p.id);
  setTimeout(async () => { for (const pid of connectedPids()) await quietSync(pid, 3); }, 1500);
  setInterval(async () => { for (const pid of connectedPids()) await quietSync(pid, 2); }, 3 * 3600 * 1000);

  loadFriends(); loadNotes();
  // Live updates arrive from the server instantly; a slow check is kept as a safety net.
  let liveT = null;
  window.addEventListener('mh-live', e => {
    clearTimeout(liveT);
    liveT = setTimeout(() => { // a burst of changes = one refresh
      const t = e.detail.table;
      if (t === 'notifications' || t === 'friendships') loadNotes();
      if (t === 'friendships' || (t === 'profiles' && UI.view === 'friends')) loadFriends(true);
    }, 400);
  });
  setInterval(() => { if (document.visibilityState === 'visible' && !social.liveConnected()) loadNotes(); }, 10000);
  setInterval(() => { if (document.visibilityState === 'visible') loadNotes(); }, 60000);
  setInterval(() => { if (document.visibilityState === 'visible' && UI.view === 'friends' && !F.view && !social.liveConnected()) loadFriends(true); }, 15000);
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
