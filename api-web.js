// Moatassim Health web: accounts, storage, sync, food search, devices and friends.
// Provides window.api (what the app screens use) and window.social (friends).
(function () {
  'use strict';
  const APP_VERSION = '2.0.42';
  const CFG = window.MH_CONFIG || {};
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const pad2 = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayKey = () => keyOf(new Date());

  // ---------------------------------------------------------------- state shape
  function defaultState(name) {
    return {
      version: 3, activeProfile: 'me',
      profiles: { me: {
        id: 'me', name: name || 'Me', color: '#E0263A', setupDone: false,
        profile: { sex: 'male', age: 30, heightCm: 175, weightKg: 75, activity: 1.55, goal: 'maintain', proteinPerKg: 1.6, fatPct: 30, goalWeightKg: null, goalStart: null, planKcal: null },
        targets: { auto: true, kcal: 2200, p: 120, c: 260, f: 75 },
        diary: {}, dayMeta: {}, weights: {}, recent: [],
        garmin: { days: {}, lastSync: null, displayName: null, mode: 'apikey' }, reminderOn: true
      } },
      settings: { reminderTime: '21:00', startWithWindows: true, closeToTray: true, usdaKey: '', theme: 'system', trayHintShown: true, lastShop: 'sainsburys' },
      customFoods: [], lastReminder: null, lastUpdate: null
    };
  }
  function normalise(s, name) {
    const d = defaultState(name);
    s = s || {};
    const p = (s.profiles && s.profiles.me) || {};
    const dp = d.profiles.me;
    return {
      ...d, ...s, activeProfile: 'me',
      settings: { ...d.settings, ...(s.settings || {}) },
      customFoods: s.customFoods || [],
      profiles: { me: { ...dp, ...p, id: 'me',
        profile: { ...dp.profile, ...(p.profile || {}) }, targets: { ...dp.targets, ...(p.targets || {}) },
        garmin: { ...dp.garmin, ...(p.garmin || {}), days: (p.garmin && p.garmin.days) || {} },
        diary: p.diary || {}, dayMeta: p.dayMeta || {}, weights: p.weights || {}, recent: p.recent || [] } }
    };
  }

  // ---------------------------------------------------------------- session + sync
  let supa = null, engine = null, uid = null, S = null, rev = 0;
  let reloadCbs = [], statusCbs = [], syncTimer = null;
  let status = { enabled: true, lastSync: null, error: null, busy: false };
  const kState = () => 'mh2.state.' + uid, kMeta = () => 'mh2.meta.' + uid;

  function makeSupa() { return new MHSync.Supa({ url: CFG.url, key: CFG.key }); }
  async function req(path, opts) { return supa._req(path, opts); }

  function persist() { LS.set(kState(), S); }
  function emitReload() { rev++; const msg = { state: JSON.parse(JSON.stringify(S)), rev }; reloadCbs.forEach(cb => cb(msg)); }
  function emitStatus() { statusCbs.forEach(cb => cb({ ...status })); }

  function startEngine() {
    engine = new MHSync.SyncEngine(supa, {
      getState: () => S,
      setState: (ns) => { S = normalise(ns); persist(); emitReload(); },
      loadMeta: () => LS.get(kMeta(), { shadow: {}, cursor: null }),
      saveMeta: (m) => { LS.set(kMeta(), { ...m, session: null }); LS.set('mh2.session', supa.session); }
    });
  }
  async function runSync() {
    if (!engine) return status;
    status.busy = true;
    try {
      const r = await engine.run();
      status = { enabled: true, lastSync: new Date().toISOString(), error: null, busy: false };
      flushFoodNotice();
    } catch (e) {
      status = { ...status, busy: false, error: e.offline ? 'Offline. Changes are saved and will sync later.' : (e.status === 401 || e.status === 400) ? 'Please sign in again.' : 'Sync problem: ' + e.message };
      if (e.status === 401 || e.status === 400) { LS.del('mh2.session'); }
    }
    emitStatus();
    return status;
  }
  function scheduleSync(ms) { clearTimeout(syncTimer); syncTimer = setTimeout(runSync, ms); }

  // Friends who asked to be told when you log food.
  let pendingFood = [], knownEntryIds = null;
  function noteNewEntries(state) {
    const p = state.profiles.me, ids = new Set();
    const day = todayKey();
    for (const [k, list] of Object.entries(p.diary || {})) for (const e of list || []) ids.add(e.id);
    if (knownEntryIds) {
      for (const e of p.diary[day] || []) if (!knownEntryIds.has(e.id) && Date.now() - (e.at || 0) < 3600e3) pendingFood.push({ name: e.name, meal: e.meal });
    }
    knownEntryIds = ids;
  }
  let foodTimer = null;
  function flushFoodNotice() {
    if (!pendingFood.length) return;
    clearTimeout(foodTimer);
    foodTimer = setTimeout(async () => {
      const items = pendingFood.splice(0);
      if (!items.length) return;
      try { await callFn('push', { kind: 'food', foods: items.map(i => i.name), meal: items[0].meal }); } catch (_) {}
    }, 20000); // wait a little so a whole meal goes out as one notification
  }

  async function callFn(name, body) {
    const token = await supa.token();
    let res;
    try { res = await fetch(`${CFG.url}/functions/v1/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + token }, body: JSON.stringify(body || {}) }); }
    catch (e) { return { ok: false, error: 'Could not reach the server. Check your internet.' }; }
    if (res.status === 404) return { ok: false, error: `The "${name}" server script isn't set up in Supabase yet.`, code: 'no_function' };
    try { return await res.json(); } catch (_) { return { ok: false, error: 'Server error (' + res.status + ').' }; }
  }

  // Ranking: % of the way from the start weight to the goal weight.
  // The start weight is always a real weigh-in: the one on the day the goal was set,
  // or the first one after it. (Never the default weight in Settings.)
  function startOf(st) {
    const p = st.profiles.me, gs = p.profile.goalStart;
    if (!gs || !gs.date) return null;
    const w = p.weights || {}, ws = Object.keys(w).filter(k => w[k] != null).sort();
    if (gs.real && gs.kg != null) return { date: gs.date, kg: gs.kg };
    // The weight saved with the goal counts if it really was a weigh-in in the week before.
    const weekBefore = new Date(gs.date + 'T12:00:00'); weekBefore.setDate(weekBefore.getDate() - 7);
    const wb = keyOf(weekBefore);
    if (gs.kg != null) { const m = ws.filter(k => k <= gs.date && k >= wb && Math.abs(w[k] - gs.kg) < 0.01).pop(); if (m) return { date: m, kg: gs.kg }; }
    const before = ws.filter(k => k < gs.date && k >= wb).pop();
    const on = before || ws.find(k => k >= gs.date) || [...ws].reverse().find(k => k < gs.date);
    if (on) return { date: on, kg: w[on] };
    return null;
  }
  // Weight used for the ranking: the average of the last 7 days of weigh-ins (since the
  // start), so a salty dinner or a glass of water doesn't swing the table.
  function progressOf(st) {
    const p = st.profiles.me, w = p.weights || {};
    const ws = Object.keys(w).filter(k => w[k] != null).sort();
    const s0 = startOf(st);
    if (!ws.length) return { start: s0, latest: null, avg: null, perWeek: null };
    const last = ws[ws.length - 1];
    const d = new Date(last + 'T12:00:00'); d.setDate(d.getDate() - 6);
    const from = keyOf(d) > (s0 ? s0.date : '') ? keyOf(d) : (s0 ? s0.date : keyOf(d));
    const win = ws.filter(k => k >= from && k <= last);
    const avg = win.reduce((a, k) => a + w[k], 0) / win.length;
    // kg per week from the last 3 weeks of weigh-ins (straight-line fit)
    const d2 = new Date(last + 'T12:00:00'); d2.setDate(d2.getDate() - 20);
    const pts = ws.filter(k => k >= keyOf(d2)).map(k => [(new Date(k + 'T12:00:00') - new Date(last + 'T12:00:00')) / 864e5, w[k]]);
    let perWeek = null;
    if (pts.length >= 2 && pts[pts.length - 1][0] - pts[0][0] >= 3) {
      const n = pts.length, mx = pts.reduce((a, q) => a + q[0], 0) / n, my = pts.reduce((a, q) => a + q[1], 0) / n;
      const sxx = pts.reduce((a, q) => a + (q[0] - mx) ** 2, 0), sxy = pts.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0);
      perWeek = sxx ? Math.round(sxy / sxx * 7 * 100) / 100 : null;
    }
    return { start: s0, latest: { date: last, kg: w[last] }, avg: Math.round(avg * 10) / 10, perWeek };
  }
  function pointsFor(st) {
    const pr = st.profiles.me.profile, pg = progressOf(st);
    if (!pg.start || pg.avg == null) return null;
    const start = pg.start.kg, cur = pg.avg, goal = pr.goalWeightKg, g = pr.goal;
    if (g === 'maintain' || goal == null || Math.abs(goal - start) < 0.1) {
      return Math.round(Math.max(0, 100 - Math.abs(cur - start) * 25) * 10) / 10 + 0; // 100 = right on your weight; -25 per kg off
    }
    return Math.round((start - cur) / (start - goal) * 1000) / 10 + 0;
  }
  let lastProfilePush = '';
  // Same check as the database (supabase/safety.sql): look-alike characters undone; usernames joined up, names word by word.
  const BAD = /(fuck|fck|shit|cunt|bitch|biatch|whore|slut|nigg|faggot|retard|rapist|hitler|kike|chink|wanker|twat|pussy|porn|paedo|pedophile|paedophile|kkk|dickhead|motherf|cocksuck|bastard|tranny|spastic|raghead|towelhead|wetback|beaner)/;
  function nameOk(t) {
    if (!t) return true;
    const map = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '|': 'i' };
    const n = String(t).toLowerCase().replace(/[013457@$!|]/g, c => map[c]).replace(/[^a-z ]/g, '');
    return / /.test(t) ? !n.split(' ').some(w => w && BAD.test(w)) : !BAD.test(n.replace(/ /g, ''));
  }
  window.MHNameOk = nameOk;
  async function pushProfile() {
    const p = S.profiles.me, pts = pointsFor(S);
    const goal = p.profile.goal === 'lose-slow' ? 'lose' : (['lose', 'gain', 'maintain'].includes(p.profile.goal) ? p.profile.goal : 'maintain');
    const pg = progressOf(S);
    const detail = JSON.stringify({ s: pg.start ? pg.start.kg : null, c: pg.latest ? pg.latest.kg : null, a: pg.avg, w: pg.perWeek, g: p.profile.goalWeightKg ?? null });
    const hideW = !!(p.game && p.game.hideWeight);
    let game = null; try { game = window.GG_PUBLIC ? JSON.stringify(window.GG_PUBLIC()) : null; } catch (_) {}
    const row = { name: (p.name || 'Me').slice(0, 40), color: p.color || '#E0263A', goal, points: pts, points_detail: hideW ? null : detail, points_updated: new Date().toISOString(), avatar: p.avatar || null };
    if (game) row.game = game;
    if (!nameOk(row.name)) delete row.name;
    const sig = JSON.stringify({ ...row, points_updated: 0 });
    if (sig === lastProfilePush) return;
    try { await req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); lastProfilePush = sig; }
    catch (e) { // before the database has the new columns: send the old fields only
      if (e.status === 400 || e.status === 404) { const { game: _g, avatar: _a, ...old } = row; try { await req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(old) }); lastProfilePush = sig; } catch (_) {} }
    }
  }
  let profileTimer = null;

  // ---------------------------------------------------------------- food search (Open Food Facts + USDA)
  const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const round = (v, d = 2) => v === null ? null : Math.round(v * 10 ** d) / 10 ** d;
  const OFF_FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,quantity,product_quantity_unit,nutriments,categories_tags';
  function offToFood(p) {
    const n = p.nutriments || {};
    const g = k => num(n[k + '_100g']);
    let kcal = g('energy-kcal');
    if (kcal === null && g('energy') !== null) kcal = g('energy') / 4.184;
    const x = (k, m) => { const v = g(k); return v === null ? null : round(v * m, 3); };
    let na = x('sodium', 1000);
    if (na === null && g('salt') !== null) na = round(g('salt') * 400, 1);
    const name = (p.product_name_en || p.product_name || '').trim();
    // Over 10 g salt per 100 g is almost always a typo in the product database (e.g. 20 g for salted nuts),
    // unless it really is salt, stock, soy sauce or seasoning. Better unknown than 10x too much.
    if (na !== null && na > 4000 && !/salt|stock|bouillon|soy|seasoning|miso|anchov|gravy|cube|marmite|fish sauce|sauce/i.test(name)) na = null;
    if (!name || kcal === null) return null;
    const brand = (p.brands || '').split(',')[0].trim();
    const liquid = String(p.product_quantity_unit || '').toLowerCase() === 'ml' || /\d\s*(ml|cl|l|litre|liter)s?\b/i.test(String(p.quantity || ''));
    return { id: 'off:' + p.code, source: 'Open Food Facts', name: brand ? `${name} (${brand})` : name, unit: liquid ? 'ml' : 'g', size: (p.quantity || '').trim() || null,
      portion: num(p.serving_quantity), portionLabel: p.serving_size || null, barcode: p.code || null,
      n: { kcal: round(kcal, 1), p: x('proteins', 1), c: x('carbohydrates', 1), f: x('fat', 1), fib: x('fiber', 1), sug: x('sugars', 1), sat: x('saturated-fat', 1), na,
        k: x('potassium', 1000), ca: x('calcium', 1000), fe: x('iron', 1000), mg: x('magnesium', 1000), zn: x('zinc', 1000), va: x('vitamin-a', 1e6), vc: x('vitamin-c', 1000),
        vd: x('vitamin-d', 1e6), ve: x('vitamin-e', 1000), vk: x('vitamin-k', 1e6), b6: x('vitamin-b6', 1000), b12: x('vitamin-b12', 1e6), fol: x('vitamin-b9', 1e6) ?? x('folates', 1e6),
        se: x('selenium', 1e6), io: x('iodine', 1e6), ph: x('phosphorus', 1000), cu: x('copper', 1000), b1: x('vitamin-b1', 1000), b2: x('vitamin-b2', 1000), b3: x('vitamin-pp', 1000), ch: x('choline', 1000),
        epa: (g('eicosapentaenoic-acid') === null && g('docosahexaenoic-acid') === null) ? null : round(((g('eicosapentaenoic-acid') || 0) + (g('docosahexaenoic-acid') || 0)) * 1000, 1),
        la: x('linoleic-acid', 1) ?? x('omega-6-fat', 1), ala: x('alpha-linolenic-acid', 1) } };
  }
  async function getJson(url, opts, ms = 15000) {
    // Open Food Facts searches go through our server: OFF blocks browsers calling its search directly.
    if (/openfoodfacts\.org\/(cgi\/search\.pl|api\/v2\/search)/.test(url)) return viaServer(url, ms + 10000);
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
    try { const r = await fetch(url, { ...(opts || {}), signal: ctrl.signal }); if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; } return await r.json(); }
    finally { clearTimeout(t); }
  }
  const recentAnswers = new Map();
  async function viaServer(url, ms) {
    const mem = recentAnswers.get(url);
    if (mem && Date.now() - mem.at < 30 * 60000) return mem.j;
    const j = await viaServerFetch(url, ms);
    recentAnswers.set(url, { j, at: Date.now() });
    if (recentAnswers.size > 60) recentAnswers.delete(recentAnswers.keys().next().value);
    return j;
  }
  async function viaServerFetch(url, ms) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const token = await supa.token();
      const r = await fetch(`${CFG.url}/functions/v1/foods`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', apikey: CFG.key, Authorization: 'Bearer ' + token }, body: JSON.stringify({ url }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || j.ok === false) { const e = new Error((j && j.error) || 'HTTP ' + r.status); e.status = r.status === 404 ? 404 : (r.status || 502); e.server = true; throw e; }
      return j;
    } finally { clearTimeout(t); }
  }
  const friendly = (e, usda) => e.name === 'AbortError' ? 'took too long to answer.' : e.server ? (e.status === 404 ? 'the food search server script is not set up yet.' : e.message) : usda && (e.status === 429 || e.status === 403) ? 'free search limit reached. Add your own free USDA key in Settings.' : e.status ? 'the service returned an error (' + e.status + ').' : 'could not connect. Check your internet connection.';
  async function searchOFF(q) {
    const mk = h => `https://${h}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}`;
    let products = [];
    try { products = (await getJson(mk('uk'))).products || []; } catch (_) {}
    if (products.length < 6) { try { products = products.concat((await getJson(mk('world'))).products || []); } catch (e) { if (!products.length) throw e; } }
    const seen = new Set();
    return products.map(offToFood).filter(f => f && !seen.has(f.id) && seen.add(f.id)).slice(0, 30);
  }
  const USDA_MAP = { '208': 'kcal', '203': 'p', '205': 'c', '204': 'f', '291': 'fib', '269': 'sug', '606': 'sat', '307': 'na', '306': 'k', '301': 'ca', '303': 'fe', '304': 'mg', '309': 'zn', '320': 'va', '401': 'vc', '328': 'vd', '323': 've', '430': 'vk', '415': 'b6', '418': 'b12', '435': 'fol', '317': 'se', '314': 'io', '305': 'ph', '312': 'cu', '404': 'b1', '405': 'b2', '406': 'b3', '421': 'ch' };
  function usdaToFood(f) {
    const n = {}; for (const k of Object.values(USDA_MAP)) n[k] = null;
    let fol = null, kj = null, atw = null, epa = null, dha = null, la = null, ala = null;
    for (const fn of f.foodNutrients || []) {
      const no = String(fn.nutrientNumber || ''), v = num(fn.value); if (v === null) continue;
      if (USDA_MAP[no] && !(no === '208' && String(fn.unitName).toUpperCase() !== 'KCAL')) n[USDA_MAP[no]] = v;
      if (no === '417') fol = v; if (no === '268') kj = v; if ((no === '957' || no === '958') && atw === null) atw = v;
      if (no === '629') epa = v; if (no === '621') dha = v; if (no === '618' || (no === '675' && la === null)) la = v; if (no === '619' || (no === '851' && ala === null)) ala = v;
    }
    if (n.kcal === null) n.kcal = atw ?? (kj !== null ? round(kj / 4.184, 1) : null);
    if (n.fol === null) n.fol = fol;
    n.epa = (epa === null && dha === null) ? null : round(((epa || 0) + (dha || 0)) * 1000, 1); n.la = la; n.ala = ala;
    if (n.kcal === null) return null;
    const name = f.description ? f.description.charAt(0) + f.description.slice(1).toLowerCase() : 'Food';
    return { id: 'usda:' + f.fdcId, source: 'USDA', name: f.brandOwner ? `${name} (${f.brandOwner})` : name, portion: null, portionLabel: null, n };
  }
  async function searchUSDA(q) {
    const key = (S && S.settings.usdaKey) || 'DEMO_KEY';
    const j = await getJson(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, pageSize: 30, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] }) });
    return (j.foods || []).map(usdaToFood).filter(Boolean);
  }
  const SHOPS = { sainsburys: { name: "Sainsbury's", tags: ["sainsbury's", 'sainsburys'] }, aldi: { name: 'Aldi', tags: ['aldi'] }, coop: { name: 'Co-op', tags: ['co-op', 'coop', 'the co-operative'] } };
  async function searchShop(shopId, q, page) {
    const shop = SHOPS[shopId]; if (!shop) return { results: [], errors: ['Unknown shop'] };
    const base = 'https://uk.openfoodfacts.org/cgi/search.pl?action=process&json=1&page_size=40&sort_by=unique_scans_n' + `&page=${Math.max(1, page || 1)}&fields=${OFF_FIELDS}` + (q ? `&search_terms=${encodeURIComponent(q)}` : '') + '&tagtype_1=countries&tag_contains_1=contains&tag_1=united-kingdom';
    // One request per search (Open Food Facts allows ~10 searches a minute).
    const urls = [`${base}&tagtype_0=stores&tag_contains_0=contains&tag_0=${encodeURIComponent(shop.tags[0])}`];
    const out = { results: [], errors: [], more: false }, seen = new Set();
    const settled = await Promise.allSettled(urls.map(u => getJson(u, {}, 20000)));
    let any = false;
    for (const r of settled) { if (r.status !== 'fulfilled') continue; any = true; const prods = r.value.products || []; if (prods.length >= 40) out.more = true; for (const p of prods) { const f = offToFood(p); if (f && !seen.has(f.id)) { seen.add(f.id); f.source = shop.name; out.results.push(f); } } }
    if (!any) out.errors.push(`${shop.name}: ` + friendly(settled[0].reason || {}));
    return out;
  }
  const SUPP_RE = /supplement|vitamin|capsule|softgel|tablet|omega|fish.?oil|cod.?liver|multivit|mineral|magnesium|zinc|collagen|creatine|probiotic|krill/i;
  async function lookupBarcode(code) {
    code = String(code).replace(/\D/g, '');
    if (!code) return null;
    const j = await getJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
    if (!(j && j.status === 1 && j.product)) return null;
    const p = j.product;
    const name = ((p.product_name_en || p.product_name || '') + ' ' + (p.brands || '').split(',')[0]).trim();
    const nm = p.product_name_en || p.product_name || '';
    const food = offToFood({ ...p, code });
    // Pills, capsules and oils are supplements. Protein shakes, bars and powders are often filed under
    // "supplements" in the product database too, but they have real calories, so they are logged as food.
    const pill = /capsule|softgel|tablet|gumm(y|ies)|multivit|cod.?liver|fish.?oil|omega.?3|krill|probiotic|effervescent/i.test(nm);
    const realFood = food && food.n && food.n.kcal >= 15 && !pill;
    const supplement = !realFood && (pill || (p.categories_tags || []).some(t => /supplement|vitamin/.test(t)) || SUPP_RE.test(nm));
    // Supplements are logged per capsule from the built-in list, not as a food with macros.
    if (supplement) return { supplement: true, name, food: null };
    return food;
  }

  // ---------------------------------------------------------------- devices (Garmin through the server)
  function gPublic() { return { ...S.profiles.me.garmin }; }
  const garmin = {
    async status() {
      const r = await callFn('wearables', { provider: 'garmin', action: 'status' });
      if (!r.ok) return { ok: true, connected: false, error: r.code === 'no_function' ? r.error : undefined, garmin: gPublic() };
      const c = (r.connections || []).find(x => x.provider === 'garmin');
      const g = S.profiles.me.garmin;
      if (c) { g.displayName = c.display_name || g.displayName || 'Garmin'; g.expiresAt = c.expires_at; g.connectedAt = c.connected_at; }
      else { g.displayName = null; g.expiresAt = null; }
      persist();
      const expired = !!(c && c.expires_at && new Date(c.expires_at) <= new Date());
      return { ok: true, connected: !!c && !expired, expired, displayName: g.displayName, mode: 'apikey', garmin: gPublic() };
    },
    async setKey(_pid, key, expires) {
      const r = await callFn('wearables', { provider: 'garmin', action: 'connect', key, expiresAt: expires });
      if (!r.ok) return r;
      const g = S.profiles.me.garmin;
      Object.assign(g, { displayName: r.displayName || 'Garmin', expiresAt: r.expiresAt, connectedAt: new Date().toISOString(), mode: 'apikey' });
      persist();
      return { ok: true, connected: true, displayName: g.displayName, garmin: gPublic() };
    },
    async sync(_pid, days) {
      const dates = []; const t = new Date();
      for (let i = Math.min(90, days) - 1; i >= 0; i--) { const d = new Date(t); d.setDate(d.getDate() - i); dates.push(keyOf(d)); }
      const g = S.profiles.me.garmin;
      for (let i = 0; i < dates.length; i += 7) {
        const chunk = dates.slice(i, i + 7);
        const r = await callFn('wearables', { provider: 'garmin', action: 'sync', dates: chunk });
        if (!r.ok) return { ...r, garmin: gPublic() };
        g.days = { ...g.days, ...r.days };
        progressCbs.forEach(cb => cb({ pid: 'me', done: Math.min(dates.length, i + 7), total: dates.length }));
      }
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      for (const [k, v] of Object.entries(g.days)) if (k < keyOf(cutoff) && v && v.hrCurve) delete v.hrCurve;
      g.lastSync = new Date().toISOString();
      persist(); scheduleSync(1500);
      return { ok: true, garmin: gPublic() };
    },
    async logout() { await callFn('wearables', { provider: 'garmin', action: 'disconnect' }); Object.assign(S.profiles.me.garmin, { displayName: null, expiresAt: null, connectedAt: null }); persist(); return { ok: true, garmin: gPublic() }; },
    login: async () => ({ ok: false, error: 'Use a Personal API key.' }),
    mfa: async () => ({ ok: false }),
    setup: async () => ({ ok: true }),
    setExpiry: async () => ({ ok: true }),
    onProgress: cb => progressCbs.push(cb),
    onSetupProgress: () => {}
  };
  const progressCbs = [];

  // ---------------------------------------------------------------- friends
  const social = {
    me: () => uid,
    async myProfile() { const r = await req(`/rest/v1/profiles?id=eq.${uid}&select=*`); return r && r[0]; },
    async updateProfile(row) { return req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); },
    async friends() {
      const fs = await req(`/rest/v1/friendships?select=*`);
      const ids = [...new Set((fs || []).map(f => f.requester === uid ? f.addressee : f.requester))];
      const profs = ids.length ? await req(`/rest/v1/profiles?id=in.(${ids.join(',')})&select=*`) : [];
      const mine = ids.length ? await req(`/rest/v1/friend_perms?owner=eq.${uid}&select=*`) : [];
      const theirs = ids.length ? await req(`/rest/v1/friend_perms?friend=eq.${uid}&select=*`) : [];
      return (fs || []).map(f => {
        const other = f.requester === uid ? f.addressee : f.requester;
        return { id: other, status: f.status, incoming: f.addressee === uid && f.status === 'pending', outgoing: f.requester === uid && f.status === 'pending', since: f.created_at,
          profile: (profs || []).find(p => p.id === other) || { name: 'Unknown' },
          iShare: (mine || []).find(p => p.friend === other) || { see_diary: false, see_weight: false, notify_logs: false },
          theyShare: (theirs || []).find(p => p.owner === other) || { see_diary: false, see_weight: false, notify_logs: false } };
      });
    },
    // Reactions on a day: fire, muscle, gg, laugh.
    async react(to, day, emoji, on) {
      if (on) return req('/rest/v1/reactions', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify([{ from_id: uid, to_id: to, day, emoji }]) });
      return req(`/rest/v1/reactions?from_id=eq.${uid}&to_id=eq.${to}&day=eq.${day}&emoji=eq.${emoji}`, { method: 'DELETE' });
    },
    async reactionsFor(to, from, until) { return (await req(`/rest/v1/reactions?to_id=eq.${to}&day=gte.${from}${until ? '&day=lte.' + until : ''}&select=*&order=created_at.desc`)) || []; },
    async addFriend(code) {
      const r = await req('/rest/v1/rpc/mh_add_friend', { method: 'POST', body: JSON.stringify({ code }) });
      if (r && r.ok) callFn('push', { kind: r.status === 'accepted' ? 'friend-accepted' : 'friend-request', to: r.id }).catch(() => {});
      return r;
    },
    async accept(other) {
      await req(`/rest/v1/friendships?requester=eq.${other}&addressee=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'accepted' }) });
      callFn('push', { kind: 'friend-accepted', to: other }).catch(() => {});
    },
    async remove(other) {
      await req(`/rest/v1/friendships?or=(and(requester.eq.${uid},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${uid}))`, { method: 'DELETE' });
      await req(`/rest/v1/friend_perms?owner=eq.${uid}&friend=eq.${other}`, { method: 'DELETE' }).catch(() => {});
    },
    async setShare(other, perms) {
      return req('/rest/v1/friend_perms?on_conflict=owner,friend', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ owner: uid, friend: other, see_diary: !!perms.see_diary, see_weight: !!perms.see_weight, notify_logs: !!perms.notify_logs }]) });
    },
    async friendItems(owner, kinds, fromDay, toDay) {
      let q = `/rest/v1/items?owner=eq.${owner}&deleted=eq.false&kind=in.(${kinds.join(',')})&select=kind,day,data`;
      if (fromDay) q += `&day=gte.${fromDay}`;
      if (toDay) q += `&day=lte.${toDay}`;
      return (await req(q + '&limit=5000')) || [];
    },
    async usernameFree(u) { return !!(await req('/rest/v1/rpc/mh_username_free', { method: 'POST', body: JSON.stringify({ u }) })); },
    async setUsername(u) {
      try { await req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ username: u }) }); }
      catch (e) { if (/isn.t allowed|22023/i.test(e.message)) throw new Error('That username isn\'t allowed. Please choose another one.'); if (e.status === 409 || /duplicate|unique/i.test(e.message)) throw Object.assign(new Error('That username was just taken. Try another.'), { taken: true }); throw e; }
      if (window.MH_ME) window.MH_ME.username = u;
    },
    async setCountry(c) { await req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ country: c || null }) }); if (window.MH_ME) window.MH_ME.country = c || null; },
    async usernameStatus(u) {
      if (!nameOk(u)) return 'not_allowed';
      try { return await req('/rest/v1/rpc/mh_username_status', { method: 'POST', body: JSON.stringify({ u }) }); }
      catch (e) { if (e.status !== 404) throw e; return (await this.usernameFree(u)) ? 'ok' : 'taken'; } // older database
    },
    async block(id) { return req('/rest/v1/rpc/mh_block', { method: 'POST', body: JSON.stringify({ target: id }) }); },
    async unblock(id) { return req('/rest/v1/rpc/mh_unblock', { method: 'POST', body: JSON.stringify({ target: id }) }); },
    async myBlocks() { return (await req('/rest/v1/rpc/mh_my_blocks', { method: 'POST', body: '{}' })) || []; },
    async report(r) { return req('/rest/v1/reports', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ reporter: uid, reported: r.id, reported_username: r.username || null, reason: r.reason, details: (r.details || '').slice(0, 1000) || null }) }); },
    // Deletes the account and everything in it from the server, then wipes this device.
    async deleteAccount() {
      await req('/rest/v1/rpc/mh_delete_me', { method: 'POST', body: '{}' });
      try { localStorage.clear(); } catch (_) {}
      try { indexedDB.deleteDatabase('gg-photos'); } catch (_) {}
      try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (_) {}
      location.replace(location.pathname + '?deleted=1');
    },
    async searchUsers(q) { return (await req('/rest/v1/rpc/mh_search_users', { method: 'POST', body: JSON.stringify({ q }) })) || []; },
    async notifications() { return (await req(`/rest/v1/notifications?select=*&order=created_at.desc&limit=50`)) || []; },
    async markRead() { return req(`/rest/v1/notifications?recipient=eq.${uid}&read=eq.false`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ read: true }) }); },
    pushSupported: () => !window.desktop && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    pushState: () => (!('Notification' in window)) ? 'unsupported' : Notification.permission,
    async enablePush() {
      if (window.desktop) return { ok: false, error: 'On the PC, new notifications show under the bell. Turn on phone notifications from the app on your iPhone.' };
      if (!social.pushSupported()) return { ok: false, error: navigator.standalone === false || !window.matchMedia('(display-mode: standalone)').matches ? 'On iPhone, notifications work once the app is added to your Home Screen (Share › Add to Home Screen) and opened from there.' : 'This browser does not support notifications.' };
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { ok: false, error: 'Notifications were not allowed. You can allow them in your phone settings.' };
      const reg = await navigator.serviceWorker.ready;
      const b64 = CFG.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
      const key = Uint8Array.from(raw, c => c.charCodeAt(0));
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const j = sub.toJSON();
      await req('/rest/v1/push_subscriptions?on_conflict=endpoint', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ endpoint: j.endpoint, user_id: uid, p256dh: j.keys.p256dh, auth: j.keys.auth }]) });
      return { ok: true };
    },
    async testPush() { return callFn('push', { kind: 'test' }); },
    async backups() { return (await req(`/rest/v1/backups?select=id,taken_at,item_count&order=taken_at.desc&limit=8`)) || []; },
    async backupNow() { return req('/rest/v1/rpc/mh_backup_me', { method: 'POST', body: '{}' }); },
    async restoreBackup(id) {
      const r = await req(`/rest/v1/backups?id=eq.${Number(id)}&select=data`);
      const rows = r && r[0] && r[0].data; if (!Array.isArray(rows)) throw new Error('That backup is empty.');
      const items = {}; for (const it of rows) items[it.id] = { kind: it.kind, profile: it.profile, day: it.day, data: it.data };
      S = normalise(MHSync.rebuild(S, items)); persist(); emitReload(); scheduleSync(300);
      return JSON.parse(JSON.stringify(S));
    },
    liveConnected: () => live.connected,
    pointsFor: (st) => pointsFor(st || S),
    startOf: (st) => startOf(st || S),
    progressOf: (st) => progressOf(st || S),
    lookupBarcode,
    signOut() { LS.del('mh2.session'); location.reload(); }
  };

  // ---------------------------------------------------------------- the api the screens use
  window.api = {
    async load() { return { state: JSON.parse(JSON.stringify(S)), version: APP_VERSION, sync: { ...status }, rev }; },
    async save(st) {
      noteNewEntries(st);
      S = normalise(st); persist(); scheduleSync(1500);
      clearTimeout(profileTimer); profileTimer = setTimeout(pushProfile, 3000);
      return true;
    },
    searchOnline: async (q, source) => {
      const out = { results: [], errors: [] };
      const jobs = [];
      if (source !== 'usda') jobs.push(searchOFF(q).then(r => out.results.push(...r)).catch(e => out.errors.push('Open Food Facts: ' + friendly(e))));
      if (source !== 'off') jobs.push(searchUSDA(q).then(r => out.results.push(...r)).catch(e => out.errors.push('USDA: ' + friendly(e, true))));
      await Promise.all(jobs); return out;
    },
    searchShop: (shop, q, page) => searchShop(shop, String(q || '').trim(), Number(page) || 1),
    garmin,
    update: { check: async () => ({}), info: async () => ({ version: APP_VERSION }), seen: async () => { if (S.lastUpdate) { S.lastUpdate.shown = true; persist(); } return true; }, openFolder: async () => {}, onRestarting: () => {} },
    sync: { connect: async () => ({ ok: true }), disconnect: async () => ({}), now: () => runSync(), info: async () => ({ ...status }), onStatus: cb => statusCbs.push(cb), onReload: cb => reloadCbs.push(cb) },
    async exportData() {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
      if (window.MHNative && window.MHNative.isApp) { await window.MHNative.shareFile(blob, `GG-Gains-backup-${todayKey()}.json`, 'GG Gains backup'); return { ok: true }; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `GG-Gains-backup-${todayKey()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return { ok: true };
    },
    importData() {
      return new Promise(resolve => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
        inp.onchange = async () => {
          try {
            const s = JSON.parse(await inp.files[0].text());
            if (!s || !(s.profiles || s.diary)) return resolve({ ok: false, error: 'That file is not a GG Gains backup.' });
            const one = s.profiles ? (s.profiles.me || s.profiles.moatassim || Object.values(s.profiles)[0]) : null;
            S = normalise(one ? { ...s, profiles: { me: { ...one, id: 'me' } } } : s); persist(); scheduleSync(500);
            resolve({ ok: true, state: JSON.parse(JSON.stringify(S)) });
          } catch (e) { resolve({ ok: false, error: 'Could not read that file.' }); }
        };
        inp.click();
      });
    },
    openDataFolder: async () => {},
    onNav: (cb) => { window.__mhNav = cb; }
  };
  window.social = social;

  // Windows app: bring in data logged in the old desktop version, once.
  async function importLegacyDesktop() {
    if (!window.desktop || !window.desktop.legacyData || LS.get('mh2.legacyDone.' + uid, false)) return;
    try {
      const old = await window.desktop.legacyData();
      LS.set('mh2.legacyDone.' + uid, true);
      if (!old || !old.profiles) return;
      const src = old.profiles.moatassim; if (!src) return;
      const me = S.profiles.me;
      for (const [day, list] of Object.entries(src.diary || {})) {
        const have = new Set((me.diary[day] || []).map(e => e.id));
        for (const e of list) if (!have.has(e.id)) (me.diary[day] = me.diary[day] || []).push(e);
      }
      for (const [d, kg] of Object.entries(src.weights || {})) if (me.weights[d] == null) me.weights[d] = kg;
      for (const [d, m] of Object.entries(src.dayMeta || {})) if (!me.dayMeta[d]) me.dayMeta[d] = m;
      for (const [d, g] of Object.entries((src.garmin && src.garmin.days) || {})) if (!me.garmin.days[d]) me.garmin.days[d] = g;
      if (!me.setupDone && src.profile) { me.profile = { ...me.profile, ...src.profile }; me.targets = { ...me.targets, ...(src.targets || {}) }; me.setupDone = true; }
      const haveFoods = new Set(S.customFoods.map(f => f.id));
      for (const f of old.customFoods || []) if (!haveFoods.has(f.id)) S.customFoods.push(f);
      persist(); scheduleSync(500);
    } catch (_) {}
  }

  // ---------------------------------------------------------------- sign in / sign up screen
  function authScreen(mode, err, info) {
    const box = $('#auth');
    box.hidden = false;
    const prevEmail = ($('#aEmail') || {}).value || '', prevName = ($('#aName') || {}).value || '';
    const signup = mode === 'signup';
    if (!info && !err && /[?&]deleted=1/.test(location.search)) info = 'Your account and all its data were deleted.';
    box.innerHTML = `<div class="au">
      <section class="au-hero">
        <div class="au-glow"></div>
        <img class="au-logo" src="icons/icon-512.png" alt="GG Gains">
        <h1 class="au-brand">GG <span>Gains</span></h1>
        <blockquote class="au-quote"><p>Consistency isn’t measured in days or weeks.<br><b>It’s measured in years.</b></p></blockquote>
        <ul class="au-perks"><li><i>🔥</i>Streaks</li><li><i>🏆</i>Ranked</li><li><i>📸</i>Transformations</li></ul>
      </section>
      <section class="au-card">
        <div class="au-seg" role="tablist"><button class="${signup ? '' : 'on'}" data-mode="signin" role="tab">Sign in</button><button class="${signup ? 'on' : ''}" data-mode="signup" role="tab">Create account</button></div>
        <h2 class="au-h">${signup ? 'Start your climb' : 'Welcome back'}</h2>
        <p class="au-sub">${signup ? 'Pick the name your friends will see on the ladder.' : 'Sign in to pick up where you left off.'}</p>
        ${err ? `<div class="au-msg err">${esc(err)}</div>` : ''}${info ? `<div class="au-msg note">${esc(info)}</div>` : ''}
        <div id="aSocial" class="auth-social"></div>
        ${signup ? '<label class="au-field"><span>Your name</span><input type="text" id="aName" autocomplete="nickname" maxlength="40" placeholder="e.g. Sara"></label>' : ''}
        <label class="au-field"><span>Email</span><input type="email" id="aEmail" autocomplete="username" autocapitalize="off" placeholder="you@example.com"></label>
        <label class="au-field"><span>Password${signup ? ' <em>· at least 8 characters</em>' : ''}</span><input type="password" id="aPass" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? 'Create a password' : 'Your password'}"></label>
        ${!signup ? '<a href="#" id="aForgot" class="au-forgot">Forgot password?</a>' : ''}
        <button class="au-go" id="aGo">${signup ? 'Create account' : 'Sign in'}</button>
        <p class="au-swap">${signup ? 'Already have an account? <a href="#" id="aSwap">Sign in</a>' : 'New to GG Gains? <a href="#" id="aSwap">Create an account</a>'}</p>
        <p class="au-legal">By continuing you agree to our <a href="terms.html" target="_blank" rel="noopener">Terms</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>
      </section>
    </div>`;
    if (prevEmail) $('#aEmail').value = prevEmail; if (prevName && $('#aName')) $('#aName').value = prevName;
    box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (b.dataset.mode !== mode) authScreen(b.dataset.mode); });
    $('#aSwap').onclick = e => { e.preventDefault(); authScreen(signup ? 'signin' : 'signup'); };
    socialButtons();
    const forgot = $('#aForgot');
    if (forgot) forgot.onclick = async e => {
      e.preventDefault();
      const email = $('#aEmail').value.trim();
      if (!email) return authScreen('signin', 'Type your email first, then tap Forgot password.');
      try { await makeSupa()._req('/auth/v1/recover', { method: 'POST', body: JSON.stringify({ email }) }, false); authScreen('signin', null, 'If that email has an account, a reset link is on its way.'); }
      catch (er) { authScreen('signin', er.message); }
    };
    const go = async () => {
      const email = $('#aEmail').value.trim(), pass = $('#aPass').value, name = signup ? $('#aName').value.trim() : '';
      if (!email || !pass || (signup && !name)) return authScreen(mode, 'Fill in all the boxes.');
      if (signup && pass.length < 8) return authScreen(mode, 'Use a password of at least 8 characters.');
      if (signup && !nameOk(name)) return authScreen(mode, 'That name isn\'t allowed. Please choose another one.');
      $('#aGo').disabled = true; $('#aGo').textContent = signup ? 'Creating…' : 'Signing in…';
      const s = makeSupa();
      try {
        if (signup) {
          const r = await s._req('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password: pass, data: { name } }) }, false);
          if (!r || !r.access_token) return authScreen('signin', null, 'Account created. Check your email for a confirmation link, then sign in.');
          s._keep(r);
        } else await s.signIn(email, pass);
      } catch (e) {
        const m = e.offline ? 'Could not connect. Check your internet.' : /registered|exists/i.test(e.message) ? 'That email already has an account. Sign in instead.' : e.message;
        return authScreen(mode, m);
      }
      LS.set('mh2.session', s.session);
      await startApp(s, signup ? name : null);
    };
    $('#aGo').onclick = go;
    box.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }));
  }

  async function startApp(s, newName) {
    supa = s; uid = s.session.user_id;
    window.MH_EMAIL = s.session.email || '';
    $('#auth').hidden = true; $('#auth').innerHTML = '';
    S = normalise(LS.get(kState(), null), newName);
    if (newName) S.profiles.me.name = newName;
    startEngine();
    const first = !LS.get(kMeta(), null) || !LS.get(kMeta(), {}).cursor;
    if (first) {
      document.body.classList.add('loading');
      try { await runSync(); } catch (_) {}
      document.body.classList.remove('loading');
    }
    try {
      const prof = await social.myProfile();
      if (prof) { if (!newName && prof.name && (S.profiles.me.name === 'Me' || !S.profiles.me.setupDone)) S.profiles.me.name = prof.name; window.MH_ME = prof; }
    } catch (_) {}
    await importLegacyDesktop();
    { // A start weight that was never actually weighed (e.g. the 75 kg default) is dropped; the first real weigh-in takes its place.
      const p = S.profiles.me, gs = p.profile.goalStart;
      if (gs && !gs.real) { const w = p.weights || {}; if (gs.kg != null && !Object.values(w).some(v => Math.abs(v - gs.kg) < 0.01)) { gs.kg = null; } }
    }
    if (!S.profiles.me.colorPicked) { // each person gets a colour automatically
      const pal = ['#E0263A', '#FF8A1F', '#2D5FC0', '#8B55E6', '#D63384', '#1B8A9A', '#C4851A', '#5B6CF0', '#E85D75', '#2F9E8F'];
      let h = 0; for (const ch of uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      S.profiles.me.color = pal[h % pal.length]; S.profiles.me.colorPicked = true;
    }
    knownEntryIds = null; noteNewEntries(S);
    persist();
    if (!document.querySelector('script[data-mh-app]')) {
      const sc = document.createElement('script'); sc.src = 'app.js?v=' + APP_VERSION; sc.dataset.mhApp = '1'; document.body.appendChild(sc);
    }
    setInterval(() => { if (document.visibilityState === 'visible') runSync(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') runSync(); });
    window.addEventListener('online', () => runSync());
    if (!first) runSync();
    pushProfile();
    startLive();
    setTimeout(pcBackup, 60000);
  }

  // ---------------------------------------------------------------- live updates
  // Supabase Realtime: the server tells the app the moment a notification, friend request
  // or friend's ranking changes, instead of the app asking every few seconds.
  const live = { ws: null, connected: false, ref: 0, hb: null, retry: 1000, topic: 'realtime:mh-live' };
  async function startLive() {
    if (!CFG.url || !('WebSocket' in window)) return;
    let token; try { token = await supa.token(); } catch (_) { return setTimeout(startLive, 30000); }
    const url = CFG.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(CFG.key) + '&vsn=1.0.0';
    let ws; try { ws = new WebSocket(url); } catch (_) { return; }
    live.ws = ws;
    const send = (topic, event, payload) => { if (ws.readyState === 1) ws.send(JSON.stringify({ topic, event, payload, ref: String(++live.ref), join_ref: '1' })); };
    ws.onopen = () => {
      send(live.topic, 'phx_join', { access_token: token, config: { broadcast: { self: false }, presence: { key: '' }, postgres_changes: [
        { event: '*', schema: 'public', table: 'notifications', filter: 'recipient=eq.' + uid },
        { event: '*', schema: 'public', table: 'friendships' },
        { event: 'UPDATE', schema: 'public', table: 'profiles' }
      ] } });
      clearInterval(live.hb);
      live.hb = setInterval(async () => {
        send('phoenix', 'heartbeat', {});
        try { const t = await supa.token(); if (t !== token) { token = t; send(live.topic, 'access_token', { access_token: t }); } } catch (_) {}
      }, 25000);
    };
    ws.onmessage = (m) => {
      let msg; try { msg = JSON.parse(m.data); } catch (_) { return; }
      if (msg.event === 'phx_reply' && msg.topic === live.topic && msg.payload && msg.payload.status === 'ok') { live.connected = true; live.retry = 1000; }
      if (msg.event === 'postgres_changes' && msg.payload && msg.payload.data) {
        window.dispatchEvent(new CustomEvent('mh-live', { detail: { table: msg.payload.data.table, type: msg.payload.data.type } }));
      }
    };
    ws.onclose = () => {
      live.connected = false; clearInterval(live.hb);
      if (live.ws === ws) setTimeout(() => { if (document.visibilityState === 'visible') startLive(); else live.ws = null; }, live.retry);
      live.retry = Math.min(60000, live.retry * 2);
    };
    ws.onerror = () => { try { ws.close(); } catch (_) {} };
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && uid && (!live.ws || live.ws.readyState > 1)) startLive(); });

  // Windows app: a backup file in Documents every week, as a copy outside the server.
  async function pcBackup() {
    if (!window.desktop || !window.desktop.saveBackup) return;
    const last = LS.get('mh2.pcBackup.' + uid, 0);
    if (Date.now() - last < 7 * 864e5) return;
    try { const r = await window.desktop.saveBackup(`GG-Gains-backup-${todayKey()}.json`, JSON.stringify(S)); if (r && r.ok) LS.set('mh2.pcBackup.' + uid, Date.now()); } catch (_) {}
  }

  // ---------------------------------------------------------------- sign in with Google / X / Apple / Facebook
  // Buttons only show for the providers switched on in Supabase (Authentication › Providers).
  const GLOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.5 5.8c4.4-4 6.8-10 6.8-17.3z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const XLOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20z"/></svg>';
  const FLOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>';
  const ALOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg>';
  const PROVIDERS = [['google', 'Continue with Google', GLOGO], ['apple', 'Continue with Apple', ALOGO], ['x', 'Continue with X', XLOGO], ['twitter', 'Continue with X', XLOGO], ['facebook', 'Continue with Facebook', FLOGO]];
  let providerCache = null;
  async function socialButtons() {
    const box = $('#aSocial'); if (!box || window.desktop) return; // Google blocks sign-in inside desktop app windows
    try {
      if (!providerCache) { const r = await fetch(CFG.url + '/auth/v1/settings', { headers: { apikey: CFG.key } }); providerCache = ((await r.json()) || {}).external || {}; }
      const app = window.MHNative && window.MHNative.isApp, ios = app && window.MHNative.platform === 'ios';
      // Apple sign-in is native on iPhone; on the web it isn't set up, so it's hidden there.
      const on = PROVIDERS.filter(([id]) => providerCache[id] && (id !== 'apple' || ios)).sort((a, b) => (b[0] === 'apple') - (a[0] === 'apple'));
      if (!on.length || !$('#aSocial')) return;
      const gis = !app && CFG.googleWebClientId && providerCache.google && !navigator.standalone; // Google's popup is unreliable in iPhone home-screen web apps
      box.innerHTML = on.map(([id, label, ic]) => id === 'google' && gis ? `<div class="gsi-slot" id="gsiSlot"><button class="social-btn sb-google" data-prov="google"><b>${ic}</b><span>${label}</span></button></div>` : `<button class="social-btn sb-${id}" data-prov="${id}"><b>${ic}</b><span>${label}</span></button>`).join('') + `<div class="auth-or"><span>or use your email</span></div>`;
      if (gis) googleWeb();
      box.onclick = async e => {
        const b = e.target.closest('[data-prov]'); if (!b) return;
        const prov = b.dataset.prov, N = window.MHNative;
        if (app && prov === 'apple') return appleNative(b);
        if (app && prov === 'google' && CFG.googleIosClientId) return googleNative(b);
        const back = app ? N.authRedirect : location.origin + location.pathname;
        const url = `${CFG.url}/auth/v1/authorize?provider=${encodeURIComponent(prov)}&redirect_to=${encodeURIComponent(back)}`;
        if (!app) { location.href = url; return; }
        if (!N.canWebAuth()) { N.openUrl(url); return; }
        b.disabled = true;
        try { const ret = await N.webAuth(url); await sessionFromHash((ret.split('#')[1] || ret.split('?')[1] || '')); }
        catch (er) { b.disabled = false; if (!(er && (er.code === 'CANCELLED' || /cancel/i.test(er.message || '')))) authScreen('signin', 'Sign-in didn\'t finish: ' + ((er && er.message) || 'unknown error')); }
      };
    } catch (_) {}
  }
  // A provider's ID token (Google, Apple) swapped for a GG Gains session.
  async function sessionFromIdToken(provider, idToken, name) {
    const s = makeSupa();
    const sess = await s._req('/auth/v1/token?grant_type=id_token', { method: 'POST', body: JSON.stringify({ provider, id_token: idToken }) }, false);
    s._keep(sess);
    LS.set('mh2.session', s.session);
    const u = sess.user || {}, isNew = u.created_at && Date.now() - new Date(u.created_at).getTime() < 3 * 60 * 1000;
    const nm = (name || '').trim();
    await startApp(s, isNew && nm && nameOk(nm) ? nm : null);
  }
  // Tokens handed back after a provider's sign-in page (#access_token=…).
  async function sessionFromHash(frag) {
    const h = new URLSearchParams(frag);
    if (h.get('error_description')) { authScreen('signin', h.get('error_description').replace(/\+/g, ' ')); return; }
    const at = h.get('access_token'), rt = h.get('refresh_token');
    if (!at || !rt) { authScreen('signin', 'Sign-in didn\'t finish. Please try again.'); return; }
    const s = makeSupa();
    const user = await s._req('/auth/v1/user', { headers: { Authorization: 'Bearer ' + at } }, false);
    s._keep({ access_token: at, refresh_token: rt, expires_in: Number(h.get('expires_in')) || 3600, user });
    LS.set('mh2.session', s.session);
    await startApp(s, null);
  }
  // Web: Google's own sign-in button. Shows "Sign in to GG Gains" and the Google accounts already on this browser.
  let gisLoading = null;
  function googleWeb() {
    const slot = $('#gsiSlot'); if (!slot) return;
    gisLoading = gisLoading || new Promise((res, rej) => { if (window.google && google.accounts) return res(); const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    gisLoading.then(() => {
      const el = $('#gsiSlot'); if (!el || !window.google || !google.accounts) return;
      google.accounts.id.initialize({ client_id: CFG.googleWebClientId, auto_select: false, cancel_on_tap_outside: true, itp_support: true, use_fedcm_for_prompt: true,
        callback: async r => { try { await sessionFromIdToken('google', r.credential); } catch (e) { authScreen('signin', 'Google sign-in didn\'t finish: ' + e.message); } } });
      const w = Math.min(400, Math.max(200, Math.round(el.getBoundingClientRect().width || 320)));
      const holder = document.createElement('div'); holder.className = 'gsi-btn';
      el.innerHTML = ''; el.appendChild(holder);
      google.accounts.id.renderButton(holder, { type: 'standard', theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: w, logo_alignment: 'center' });
      try { google.accounts.id.prompt(); } catch (_) {}
    }).catch(() => {}); // if Google's script can't load, the normal Continue with Google button stays
  }
  // iPhone app: Google sign-in through the app's own Google client.
  async function googleNative(btn) {
    btn.disabled = true;
    try { const r = await window.MHNative.googleSignIn(CFG.googleIosClientId); await sessionFromIdToken('google', r.idToken); }
    catch (e) { btn.disabled = false; if (e && (e.code === 'CANCELLED' || /cancel/i.test(e.message || ''))) return; authScreen('signin', 'Google sign-in didn\'t finish: ' + ((e && e.message) || 'unknown error')); }
  }
  // Sign in with Apple on iPhone: Apple gives us a signed token, Supabase swaps it for a session.
  async function appleNative(btn) {
    btn.disabled = true;
    try { const r = await window.MHNative.appleSignIn(); await sessionFromIdToken('apple', r.idToken, r.name); }
    catch (e) {
      btn.disabled = false;
      if (e && (e.code === 'CANCELLED' || /cancel/i.test(e.message || ''))) return;
      authScreen('signin', 'Apple sign-in didn\'t finish: ' + ((e && e.message) || 'unknown error'));
    }
  }
  // Coming back from Google/X: the session arrives in the address bar (#access_token=…).
  async function finishOAuth() {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('error_description')) { history.replaceState(null, '', location.pathname); authScreen('signin', h.get('error_description').replace(/\+/g, ' ')); return 'shown'; }
    const at = h.get('access_token'), rt = h.get('refresh_token');
    if (!at || !rt) return null;
    history.replaceState(null, '', location.pathname);
    const s = makeSupa();
    try {
      const user = await s._req('/auth/v1/user', { headers: { Authorization: 'Bearer ' + at } }, false);
      s._keep({ access_token: at, refresh_token: rt, expires_in: Number(h.get('expires_in')) || 3600, user });
      LS.set('mh2.session', s.session);
      return s;
    } catch (e) { authScreen('signin', 'Sign-in did not finish: ' + e.message); return 'shown'; }
  }

  // ---------------------------------------------------------------- boot
  window.MHBoot = async function () {
    const APP = window.MHNative && window.MHNative.isApp;
    if (!APP && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (!CFG.url || !CFG.key) { $('#auth').hidden = false; $('#auth').innerHTML = '<div class="auth-card"><h1>Setup needed</h1><p>config.js has no Supabase project.</p></div>'; return; }
    if (/access_token=|error_description=/.test(location.hash)) {
      const r = await finishOAuth();
      if (r === 'shown') return;
      if (r) return startApp(r, null);
    }
    const saved = LS.get('mh2.session', null);
    if (saved && saved.refresh_token) {
      const s = makeSupa(); s.session = saved;
      if (navigator.onLine) { try { await s.refresh(saved.refresh_token); LS.set('mh2.session', s.session); } catch (e) { if (!e.offline && (e.status === 400 || e.status === 401)) { LS.del('mh2.session'); return authScreen('signin', 'Please sign in again.'); } } }
      return startApp(s, null);
    }
    authScreen('signin');
  };
})();
