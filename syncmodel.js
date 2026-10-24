// Moatassim Health sync: shared by the PC app (Node) and the phone app (browser).
// Data is split into small "items" (one per food entry, weigh-in, profile...) so
// the PC and the phone can both edit at the same time without overwriting each
// other. Items are stored in the user's own Supabase project, behind their login.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MHSync = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- items
  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  const hashItem = it => it ? (it.deleted ? 'X' : stable([it.kind, it.profile || null, it.day || null, it.data])) : 'X';
  // Profiles are merged setting by setting, so one device changing (say) the soup pot
  // size never sends back another device's out-of-date macro targets.
  const fieldHashes = it => { const o = {}; for (const k of Object.keys((it && it.data) || {})) o[k] = stable(it.data[k]); return o; };
  function mergeProfile(local, remote, base) {
    const L = local.data || {}, R = remote.data || {}, out = {};
    for (const k of new Set([...Object.keys(L), ...Object.keys(R)])) {
      const changedHere = base ? stable(L[k]) !== (base[k] === undefined ? 'null' : base[k]) : R[k] === undefined;
      const v = changedHere ? L[k] : R[k];
      if (v !== undefined) out[k] = v;
    }
    return { ...remote, data: out };
  }

  const PROFILE_FIELDS = ['name', 'color', 'setupDone', 'profile', 'targets', 'reminderOn'];
  const GARMIN_SKIP = ['hrCurve'];

  function toItems(state) {
    const out = {};
    for (const [pid, p] of Object.entries(state.profiles || {})) {
      const pd = {};
      for (const f of PROFILE_FIELDS) if (p[f] !== undefined) pd[f] = p[f];
      out['p:' + pid] = { kind: 'profile', profile: pid, day: null, data: pd };
      for (const [day, list] of Object.entries(p.diary || {})) for (const e of list || []) {
        out['e:' + pid + ':' + e.id] = { kind: 'entry', profile: pid, day, data: e };
      }
      for (const [day, kg] of Object.entries(p.weights || {})) if (kg != null) out['w:' + pid + ':' + day] = { kind: 'weight', profile: pid, day, data: { kg } };
      for (const [day, m] of Object.entries(p.dayMeta || {})) if (m && Object.keys(m).length) out['m:' + pid + ':' + day] = { kind: 'daymeta', profile: pid, day, data: m };
      for (const [day, g] of Object.entries((p.garmin && p.garmin.days) || {})) {
        if (!g) continue;
        const d = {};
        for (const [k, v] of Object.entries(g)) if (!GARMIN_SKIP.includes(k) && v !== null && v !== undefined) d[k] = v;
        out['g:' + pid + ':' + day] = { kind: 'garmin', profile: pid, day, data: d };
      }
    }
    for (const f of state.customFoods || []) out['f:' + f.id] = { kind: 'food', profile: null, day: null, data: f };
    return out;
  }

  // Replace the synced parts of `state` with `items`, keeping device-only parts
  // (recent foods, Garmin heart-rate curves, settings).
  function rebuild(state, items) {
    const s = JSON.parse(JSON.stringify(state));
    s.profiles = s.profiles || {};
    const prevGarmin = {};
    for (const [pid, p] of Object.entries(s.profiles)) {
      prevGarmin[pid] = (p.garmin && p.garmin.days) || {};
      p.diary = {}; p.weights = {}; p.dayMeta = {};
      p.garmin = { ...(p.garmin || {}), days: {} };
    }
    s.customFoods = [];
    const ensure = pid => {
      if (!s.profiles[pid]) s.profiles[pid] = { id: pid, diary: {}, weights: {}, dayMeta: {}, recent: [], garmin: { days: {} } };
      return s.profiles[pid];
    };
    const entries = [];
    for (const [id, it] of Object.entries(items)) {
      if (!it || it.deleted) continue;
      if (it.kind === 'profile') Object.assign(ensure(it.profile), it.data || {});
      else if (it.kind === 'entry') entries.push(it);
      else if (it.kind === 'weight') ensure(it.profile).weights[it.day] = it.data.kg;
      else if (it.kind === 'daymeta') ensure(it.profile).dayMeta[it.day] = it.data;
      else if (it.kind === 'garmin') { const p = ensure(it.profile); p.garmin.days[it.day] = { ...((prevGarmin[it.profile] || {})[it.day] || {}), ...it.data }; }
      else if (it.kind === 'food') s.customFoods.push(it.data);
    }
    entries.sort((a, b) => ((a.data.at || 0) - (b.data.at || 0)) || String(a.data.id).localeCompare(String(b.data.id)));
    for (const it of entries) { const p = ensure(it.profile); (p.diary[it.day] = p.diary[it.day] || []).push(it.data); }
    s.customFoods.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    return s;
  }

  // ---------------------------------------------------------------- Supabase
  class Supa {
    constructor({ url, key, fetchImpl }) {
      this.url = String(url || '').replace(/\/+$/, '');
      this.key = key;
      this.fetch = fetchImpl || ((...a) => fetch(...a));
      this.session = null; // { access_token, refresh_token, expires_at, user_id }
    }
    async _req(path, opts = {}, auth = true) {
      const headers = { apikey: this.key, 'Content-Type': 'application/json', ...(opts.headers || {}) };
      if (auth) headers.Authorization = 'Bearer ' + (await this.token());
      let res;
      try { res = await this.fetch(this.url + path, { ...opts, headers }); }
      catch (e) { const err = new Error('offline'); err.offline = true; throw err; }
      const text = await res.text();
      let body = null; try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }
      if (!res.ok) {
        const msg = (body && (body.error_description || body.msg || body.message || body.error)) || ('HTTP ' + res.status);
        const err = new Error(msg); err.status = res.status; err.body = body; throw err;
      }
      return body;
    }
    _keep(b) {
      this.session = { access_token: b.access_token, refresh_token: b.refresh_token, expires_at: Date.now() + (b.expires_in || 3600) * 1000, user_id: b.user && b.user.id, email: b.user && b.user.email };
      return this.session;
    }
    async signIn(email, password) {
      try { return this._keep(await this._req('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }, false)); }
      catch (e) { if (e.status === 400 || e.status === 401) e.message = 'Wrong email or password.'; throw e; }
    }
    async refresh(refreshToken) {
      return this._keep(await this._req('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken || (this.session && this.session.refresh_token) }) }, false));
    }
    async token() {
      if (!this.session) throw Object.assign(new Error('Not signed in'), { status: 401 });
      if (this.session.expires_at - Date.now() < 120000) await this.refresh();
      return this.session.access_token;
    }
    async upsert(rows) {
      for (let i = 0; i < rows.length; i += 400) {
        await this._req('/rest/v1/items?on_conflict=owner,id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows.slice(i, i + 400)) });
      }
    }
    async since(cursor) {
      const out = [], seen = new Set();
      let after = cursor || '1970-01-01T00:00:00Z';
      for (let guard = 0; guard < 500; guard++) {
        const mine = this.session && this.session.user_id ? `&owner=eq.${this.session.user_id}` : '';
        const q = `/rest/v1/items?select=id,kind,profile,day,data,deleted,updated_at${mine}&updated_at=gte.${encodeURIComponent(after)}&order=updated_at.asc,id.asc&limit=1000`;
        const rows = await this._req(q);
        let added = 0;
        for (const r of rows) { const k = r.id + '|' + r.updated_at; if (!seen.has(k)) { seen.add(k); out.push(r); added++; } }
        if (rows.length < 1000 || !added) break;
        after = rows[rows.length - 1].updated_at;
      }
      return out;
    }
  }

  // ---------------------------------------------------------------- engine
  // adapter: { getState(), setState(state, changedByRemote), loadMeta(), saveMeta(meta) }
  // meta: { shadow: {id: hash}, cursor, session }
  function setShadow(meta, id, it, h) {
    meta.shadow[id] = h;
    if (it && it.kind === 'profile') meta.fshadow[id] = fieldHashes(it); else delete meta.fshadow[id];
  }

  class SyncEngine {
    constructor(supa, adapter) { this.supa = supa; this.a = adapter; this.busy = null; this.lastError = null; this.lastSync = null; }

    async run() {
      if (this.busy) return this.busy;
      this.busy = this._run().finally(() => { this.busy = null; });
      return this.busy;
    }

    async _run() {
      const meta = this.a.loadMeta() || {};
      meta.shadow = meta.shadow || {};
      meta.fshadow = meta.fshadow || {};
      if (meta.session && !this.supa.session) this.supa.session = meta.session;
      if (!this.supa.session) throw Object.assign(new Error('Not signed in'), { status: 401 });
      try {
        // 0) First sync on this device: take what the account already has before pushing
        //    anything, so a fresh install never overwrites real data with blank defaults.
        if (!meta.cursor) {
          const all = await this.supa.since(null);
          const st0 = this.a.getState();
          const items0 = toItems(st0);
          let got = 0;
          for (const r of all) {
            if (r.deleted) { setShadow(meta, r.id, null, 'X'); delete items0[r.id]; }
            else { const it = { kind: r.kind, profile: r.profile, day: r.day, data: r.data }; items0[r.id] = it; setShadow(meta, r.id, it, hashItem(it)); got++; }
            if (!meta.cursor || r.updated_at > meta.cursor) meta.cursor = r.updated_at;
          }
          if (got) this.a.setState(rebuild(st0, items0), true);
          if (!meta.cursor) meta.cursor = '1970-01-01T00:00:00.000Z'; // empty account: still counts as synced
        }
        // 1) Pull everything changed since last time (with a 5-minute overlap), merging
        //    profile settings, so what goes up next already includes the other devices' changes.
        const cursor = meta.cursor ? new Date(new Date(meta.cursor).getTime() - 5 * 60000).toISOString() : null;
        const remote = await this.supa.since(cursor);
        let state = this.a.getState();
        const cur = toItems(state);
        let changed = 0;
        const items = { ...cur };
        for (const r of remote) {
          const it = r.deleted ? null : { kind: r.kind, profile: r.profile, day: r.day, data: r.data };
          const rh = r.deleted ? 'X' : hashItem(it);
          const lh = hashItem(cur[r.id]);
          if (lh !== (meta.shadow[r.id] ?? 'X') && lh !== rh) { // edited here since last push
            if (it && it.kind === 'profile' && cur[r.id]) { // merge: settings changed here win, the rest come from the server
              const m = mergeProfile(cur[r.id], it, meta.fshadow[r.id]);
              if (hashItem(m) !== lh) { items[r.id] = m; changed++; }
              setShadow(meta, r.id, it, rh);
              if (!meta.cursor || r.updated_at > meta.cursor) meta.cursor = r.updated_at;
            }
            continue; // anything else: keep local, it goes up next
          }
          if (lh !== rh) { if (it) items[r.id] = it; else delete items[r.id]; changed++; }
          setShadow(meta, r.id, it, rh);
          if (!meta.cursor || r.updated_at > meta.cursor) meta.cursor = r.updated_at;
        }
        if (changed) this.a.setState(rebuild(state, items), true);
        // 2) Push local changes.
        state = this.a.getState();
        const local = toItems(state);
        const rows = [];
        const uid = this.supa.session.user_id;
        for (const [id, it] of Object.entries(local)) {
          const h = hashItem(it);
          if (meta.shadow[id] !== h) rows.push({ owner: uid, id, kind: it.kind, profile: it.profile, day: it.day, data: it.data, deleted: false, _h: h });
        }
        for (const id of Object.keys(meta.shadow)) {
          if (!local[id] && meta.shadow[id] !== 'X') rows.push({ owner: uid, id, kind: id.split(':')[0], profile: null, day: null, data: null, deleted: true, _h: 'X' });
        }
        if (rows.length) {
          await this.supa.upsert(rows.map(({ _h, ...r }) => r));
          for (const r of rows) setShadow(meta, r.id, r.deleted ? null : local[r.id], r._h);
        }
        meta.session = this.supa.session;
        this.a.saveMeta(meta);
        this.lastSync = new Date().toISOString();
        this.lastError = null;
        return { ok: true, pushed: rows.length, pulled: changed };
      } catch (e) {
        meta.session = this.supa.session || meta.session;
        this.a.saveMeta(meta);
        this.lastError = e.offline ? 'offline' : e.message;
        throw e;
      }
    }
  }

  return { toItems, rebuild, hashItem, stable, mergeProfile, Supa, SyncEngine };
});
