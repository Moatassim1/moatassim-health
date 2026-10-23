// Moatassim Health web: accounts, storage, sync, food search, devices and friends.
// Provides window.api (what the app screens use) and window.social (friends).
(function () {
  'use strict';
  const APP_VERSION = '2.0.7';
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
  function pointsFor(st) {
    const p = st.profiles.me, pr = p.profile;
    const ws = Object.keys(p.weights || {}).filter(k => p.weights[k] != null).sort();
    const cur = ws.length ? p.weights[ws[ws.length - 1]] : null;
    const s0 = startOf(st);
    if (cur == null || !s0) return null;
    const start = s0.kg, goal = pr.goalWeightKg, g = pr.goal;
    if (g === 'maintain' || goal == null || Math.abs(goal - start) < 0.1) {
      return Math.round(Math.max(0, 100 - Math.abs(cur - start) * 25) * 10) / 10; // 100 = right on your weight; -25 per kg off
    }
    return Math.round((start - cur) / (start - goal) * 1000) / 10 + 0;
  }
  let lastProfilePush = '';
  async function pushProfile() {
    const p = S.profiles.me, pts = pointsFor(S);
    const goal = p.profile.goal === 'lose-slow' ? 'lose' : (['lose', 'gain', 'maintain'].includes(p.profile.goal) ? p.profile.goal : 'maintain');
    const s0 = startOf(S), ws = Object.keys(p.weights || {}).filter(k => p.weights[k] != null).sort();
    const cur = ws.length ? p.weights[ws[ws.length - 1]] : null;
    const detail = JSON.stringify({ s: s0 ? s0.kg : null, c: cur, g: p.profile.goalWeightKg ?? null });
    const row = { name: (p.name || 'Me').slice(0, 40), color: p.color || '#E0263A', goal, points: pts, points_detail: detail, points_updated: new Date().toISOString() };
    const sig = JSON.stringify({ ...row, points_updated: 0 });
    if (sig === lastProfilePush) return;
    try { await req(`/rest/v1/profiles?id=eq.${uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) }); lastProfilePush = sig; } catch (_) {}
  }
  let profileTimer = null;

  // ---------------------------------------------------------------- food search (Open Food Facts + USDA)
  const num = v => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? null : Number(v);
  const round = (v, d = 2) => v === null ? null : Math.round(v * 10 ** d) / 10 ** d;
  const OFF_FIELDS = 'code,product_name,product_name_en,brands,serving_size,serving_quantity,quantity,product_quantity_unit,nutriments';
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
  async function lookupBarcode(code) {
    code = String(code).replace(/\D/g, '');
    if (!code) return null;
    const j = await getJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
    return j && j.status === 1 && j.product ? offToFood({ ...j.product, code }) : null;
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
    pointsFor: (st) => pointsFor(st || S),
    startOf: (st) => startOf(st || S),
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
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Mabrouka-Tracker-backup-${todayKey()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return { ok: true };
    },
    importData() {
      return new Promise(resolve => {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
        inp.onchange = async () => {
          try {
            const s = JSON.parse(await inp.files[0].text());
            if (!s || !(s.profiles || s.diary)) return resolve({ ok: false, error: 'That file is not a Mabrouka Tracker backup.' });
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
    const signup = mode === 'signup';
    box.innerHTML = `<div class="auth-card">
      <img class="auth-logo" src="icons/icon-180.png" alt="">
      <h1>Mabrouka Tracker</h1>
      <p class="muted">${signup ? 'Create your account. Pick the name your friends will see.' : 'Sign in to your account.'}</p>
      ${signup ? '<label class="field"><span>Your name</span><input type="text" id="aName" autocomplete="nickname" maxlength="40"></label>' : ''}
      <label class="field"><span>Email</span><input type="email" id="aEmail" autocomplete="username" autocapitalize="off"></label>
      <label class="field"><span>Password${signup ? ' (at least 8 characters)' : ''}</span><input type="password" id="aPass" autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
      <button class="btn primary" id="aGo">${signup ? 'Create account' : 'Sign in'}</button>
      ${err ? `<div class="err">${esc(err)}</div>` : ''}${info ? `<div class="note">${esc(info)}</div>` : ''}
      <p class="small" style="margin-top:18px">${signup ? 'Already have an account? <a href="#" id="aSwap">Sign in</a>' : 'New here? <a href="#" id="aSwap">Create an account</a>'}</p>
      ${!signup ? '<p class="small"><a href="#" id="aForgot">Forgot password?</a></p>' : ''}
    </div>`;
    $('#aSwap').onclick = e => { e.preventDefault(); authScreen(signup ? 'signin' : 'signup'); };
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
  }

  // ---------------------------------------------------------------- boot
  window.MHBoot = async function () {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    if (!CFG.url || !CFG.key) { $('#auth').hidden = false; $('#auth').innerHTML = '<div class="auth-card"><h1>Setup needed</h1><p>config.js has no Supabase project.</p></div>'; return; }
    const saved = LS.get('mh2.session', null);
    if (saved && saved.refresh_token) {
      const s = makeSupa(); s.session = saved;
      if (navigator.onLine) { try { await s.refresh(saved.refresh_token); LS.set('mh2.session', s.session); } catch (e) { if (!e.offline && (e.status === 400 || e.status === 401)) { LS.del('mh2.session'); return authScreen('signin', 'Please sign in again.'); } } }
      return startApp(s, null);
    }
    authScreen('signin');
  };
})();
