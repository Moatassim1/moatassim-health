// @ts-nocheck
// Moatassim Health: wearable connections (runs on Supabase as the "wearables" function).
// Keys are stored ENCRYPTED in public.wearable_keys (AES-256-GCM), which the app itself can never read back.
// The encryption key comes from the function's environment (MH_KEY_SECRET, or the service key), never the database.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Garmin Connect Personal API (official). You create a key in Garmin Connect
// (Settings > Personal API Key). The key is swapped for a 24-hour access token,
// which is then sent as "Authorization: Bearer <token>".
// Endpoints follow Garmin's own library: github.com/garmin/connect-personal-api-python

const BASE = (globalThis.Deno && Deno.env.get('MH_GARMIN_BASE')) || 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

class PersonalApiError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

function jwtExpiry(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = JSON.parse(atob(part + '==='.slice((part.length + 3) % 4))).exp;
    if (exp) return exp * 1000;
  } catch (_) {}
  return Date.now() + 20 * 3600 * 1000;
}

// Deep search helpers: Garmin's JSON nests values in different places per endpoint.
function find(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 6) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined) return obj[key];
  for (const v of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (v && typeof v === 'object') { const r = find(v, key, depth + 1); if (r !== undefined) return r; }
  }
  return undefined;
}
const num = v => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
function pick(obj, ...keys) { for (const k of keys) { const v = num(find(obj, k)); if (v !== null) return v; } return null; }
function pickStr(obj, ...keys) { for (const k of keys) { const v = find(obj, k); if (v !== undefined && typeof v !== 'object') return v; } return null; }

class PersonalApi {
  constructor(apiKey, { timeoutMs = 30000 } = {}) {
    this.apiKey = String(apiKey || '').trim();
    this.timeoutMs = timeoutMs;
    this.token = null;
    this.tokenExp = 0;
  }

  async _fetch(url, opts) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    catch (e) { throw new PersonalApiError(e.name === 'AbortError' ? 'Garmin took too long to answer.' : 'Could not reach Garmin. Check your internet connection.'); }
    finally { clearTimeout(t); }
  }

  async getToken(force) {
    if (!force && this.token && this.tokenExp - Date.now() > 3600 * 1000) return this.token;
    if (!this.apiKey) throw new PersonalApiError('No Personal API key saved.', 401);
    const res = await this._fetch(BASE + TOKEN_PATH, { method: 'POST', headers: { Accept: '*/*', Authorization: 'ApiKey ' + this.apiKey } });
    const body = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new PersonalApiError('Garmin did not accept this Personal API key. It may have been deleted, expired or copied incompletely.', res.status, body);
      if (res.status === 429) throw new PersonalApiError('Garmin says too many requests. Try again in a few minutes.', 429, body);
      throw new PersonalApiError(`Garmin returned an error (${res.status}).`, res.status, body);
    }
    let token = body.trim();
    if (token.startsWith('{')) { try { const j = JSON.parse(token); token = j.access_token || j.accessToken || j.token || token; } catch (_) {} }
    token = token.replace(/^"|"$/g, '');
    this.token = token;
    this.tokenExp = jwtExpiry(token);
    return token;
  }

  async get(path, params, retried) {
    const token = await this.getToken();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await this._fetch(BASE + path + qs, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + token } });
    if (res.status === 401 && !retried) { this.token = null; return this.get(path, params, true); }
    if (res.status === 204 || res.status === 404) return null;
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 429) throw new PersonalApiError('Garmin says too many requests. Try again in a few minutes.', 429, text);
      throw new PersonalApiError(`Garmin returned an error (${res.status}) for ${path.split('/')[1]}.`, res.status, text);
    }
    if (!text.trim()) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
  }

  async profile() {
    const p = await this.get('/userprofile-service/userprofile/settings');
    return { displayName: pickStr(p, 'fullName', 'displayName', 'userName') };
  }

  // Fetch and summarise days (YYYY-MM-DD), oldest first. progress(done, total).
  async fetchDays(dates, progress = () => {}) {
    const days = {}, raw = {};
    if (!dates.length) return { days, raw };
    // One call for the whole range: steps, calories, resting HR, stress, Body Battery.
    let summaries = [];
    try {
      const s = await this.get('/usersummary-service/v2/dailysummaries', { startDate: dates[0], endDate: dates[dates.length - 1] });
      raw.summaries = s;
      summaries = Array.isArray(s) ? s : (find(s, 'data') || find(s, 'dailySummaries') || find(s, 'values') || []);
      if (!Array.isArray(summaries)) summaries = [];
    } catch (e) { if (e.status === 401 || e.status === 403) throw e; raw.summariesError = e.message; }
    const byDate = {};
    for (const it of summaries) { const d = pickStr(it, 'calendarDate', 'date', 'summaryDate'); if (d) byDate[String(d).slice(0, 10)] = it; }
    // Steps also have their own endpoint; used when the daily summary has none.
    const stepsBy = {};
    try {
      const s2 = await this.get(`/usersummary-service/stats/steps/daily/${dates[0]}/${dates[dates.length - 1]}`);
      const arr = Array.isArray(s2) ? s2 : (find(s2, 'values') || find(s2, 'data') || []);
      if (Array.isArray(arr)) for (const it of arr) { const d = pickStr(it, 'calendarDate', 'date'); if (d) stepsBy[String(d).slice(0, 10)] = it; }
    } catch (e) { if (e.status === 401 || e.status === 403) throw e; raw.stepsError = e.message; }
    // Workouts (swims, runs, gym...) in the range.
    const actsBy = {};
    try {
      const a = await this.get('/activitylist-service/activities/search/activities', { start: 0, limit: 100, startDate: dates[0], endDate: dates[dates.length - 1] });
      const list = Array.isArray(a) ? a : (find(a, 'activityList') || find(a, 'activities') || find(a, 'data') || []);
      if (Array.isArray(list)) for (const x of list) {
        const start = String(pickStr(x, 'startTimeLocal', 'startTimeGMT') || '');
        const d = start.slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        const type = String(pickStr(find(x, 'activityType') || {}, 'typeKey') || pickStr(x, 'activityTypeKey') || 'other');
        const dur = pick(x, 'duration', 'elapsedDuration', 'movingDuration');
        const dist = pick(x, 'distance');
        (actsBy[d] = actsBy[d] || []).push({ id: String(pickStr(x, 'activityId') ?? start), name: String(pickStr(x, 'activityName') || type.replace(/_/g, ' ')), type,
          start: start.slice(11, 16), min: dur !== null ? Math.round(dur / 60) : null, kcal: pick(x, 'calories', 'activeCalories') !== null ? Math.round(pick(x, 'calories', 'activeCalories')) : null,
          km: dist ? Math.round(dist / 10) / 100 : null, avgHr: pick(x, 'averageHR', 'averageHr') });
      }
    } catch (e) { if (e.status === 401 || e.status === 403) throw e; raw.activitiesError = e.message; }
    console.log('garmin activities', dates[0], dates[dates.length - 1], raw.activitiesError || '', Object.values(actsBy).flat().map(x => x.type + ' ' + x.min + 'min').join(', '));

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const [sl, hr, hv] = await Promise.all([
        this.get('/sleep-service/sleep/dailySleep', { date }).catch(e => ({ __err: e.message })),
        this.get('/wellness-service/wellness/dailyHeartRate', { date }).catch(e => ({ __err: e.message })),
        this.get(`/hrv-service/hrv/${date}`).catch(e => ({ __err: e.message }))
      ]);
      if (i === dates.length - 1) Object.assign(raw, { sleep: sl, heartRate: hr, hrv: hv, summary: byDate[date] || null, date });
      days[date] = summarise(date, byDate[date] || {}, sl || {}, hr || {}, hv || {});
      const sd = stepsBy[date];
      if (days[date].steps === null && sd) { days[date].steps = pick(sd, 'totalSteps', 'steps', 'value'); if (days[date].stepGoal === null) days[date].stepGoal = pick(sd, 'stepGoal', 'dailyStepGoal'); if (days[date].distanceKm === null) { const m = pick(sd, 'totalDistance', 'distance'); days[date].distanceKm = m !== null ? Math.round(m / 10) / 100 : null; } }
      days[date].activities = actsBy[date] || [];
      progress(i + 1, dates.length);
      await new Promise(r => setTimeout(r, 120));
    }
    return { days, raw };
  }
}

function summarise(date, st, sl, hr, hv) {
  const day = { date, source: 'personal-api' };
  // Newer daily summaries group values: movement.steps {value, goal, distanceInMeters}, calories {burnedTotal...},
  // heartRate {minValue, maxValue, restingValue}, stress {avgLevel}, bodyBattery {...}, intensityMinutes {...}.
  const sub = k => { const v = st && st[k]; return v && typeof v === 'object' ? v : {}; };
  const mv = sub('movement'), stp = mv.steps && typeof mv.steps === 'object' ? mv.steps : {}, cal2 = sub('calories'), hr2 = sub('heartRate'),
    ss2 = sub('stress'), bb2 = sub('bodyBattery'), im2 = sub('intensityMinutes'), ox2 = sub('pulseOx');
  day.steps = pick(stp, 'value') ?? pick(st, 'totalSteps', 'steps');
  day.stepGoal = pick(stp, 'goal') ?? pick(st, 'dailyStepGoal', 'stepGoal');
  const dist = pick(stp, 'distanceInMeters') ?? pick(st, 'totalDistanceMeters', 'distanceInMeters');
  day.distanceKm = dist !== null ? Math.round(dist / 10) / 100 : null;
  const cal = find(st, 'calories');
  const calObj = cal && typeof cal === 'object' ? cal : {};
  day.kcalTotal = pick(cal2, 'burnedTotal') ?? pick(st, 'totalKilocalories') ?? pick(calObj, 'total', 'totalKilocalories', 'burned');
  day.kcalActive = pick(cal2, 'burnedActive') ?? pick(st, 'activeKilocalories') ?? pick(calObj, 'active', 'activeKilocalories');
  day.kcalBmr = pick(cal2, 'burnedResting') ?? pick(st, 'bmrKilocalories') ?? pick(calObj, 'bmr', 'resting', 'bmrKilocalories');
  day.restingHr = pick(hr2, 'restingValue') ?? pick(st, 'restingHeartRate') ?? pick(hr, 'restingHeartRate') ?? pick(sl, 'restingHeartRate');
  day.minHr = pick(hr2, 'minValue') ?? pick(st, 'minHeartRate') ?? pick(hr, 'minHeartRate');
  day.maxHr = pick(hr2, 'maxValue') ?? pick(st, 'maxHeartRate') ?? pick(hr, 'maxHeartRate');
  day.stressAvg = pick(ss2, 'avgLevel') ?? pick(st, 'averageStressLevel');
  day.bbHigh = pick(bb2, 'maxValue') ?? pick(st, 'bodyBatteryHighestValue');
  day.bbLow = pick(bb2, 'minValue') ?? pick(st, 'bodyBatteryLowestValue');
  day.bbNow = pick(bb2, 'latestValue') ?? pick(st, 'bodyBatteryMostRecentValue');
  day.bbCharged = pick(bb2, 'chargedValue') ?? pick(st, 'bodyBatteryChargedValue');
  day.bbDrained = pick(bb2, 'drainedValue') ?? pick(st, 'bodyBatteryDrainedValue');
  const mod = pick(im2, 'moderate') ?? pick(st, 'moderateIntensityMinutes'), vig = pick(im2, 'vigorous') ?? pick(st, 'vigorousIntensityMinutes');
  day.intensityMin = mod === null && vig === null ? null : (mod || 0) + 2 * (vig || 0);
  day.floors = pick(mv.floorsAscended && typeof mv.floorsAscended === 'object' ? mv.floorsAscended : {}, 'value') ?? pick(st, 'floorsAscended');
  day.spo2Avg = pick(ox2, 'avgValue', 'averageValue') ?? pick(st, 'averageSpo2');

  const ds = find(sl, 'dailySleepDTO') || sl;
  const scores = find(ds, 'sleepScores');
  day.sleepScore = scores ? pick(find(scores, 'overall') || scores, 'value') : pick(ds, 'sleepScore', 'overallSleepScore');
  day.sleepQuality = scores ? pickStr(find(scores, 'overall') || {}, 'qualifierKey') : null;
  day.sleepSec = pick(ds, 'sleepTimeSeconds');
  day.deepSec = pick(ds, 'deepSleepSeconds');
  day.lightSec = pick(ds, 'lightSleepSeconds');
  day.remSec = pick(ds, 'remSleepSeconds');
  day.awakeSec = pick(ds, 'awakeSleepSeconds');
  day.sleepStart = pick(ds, 'sleepStartTimestampLocal');
  day.sleepEnd = pick(ds, 'sleepEndTimestampLocal');
  day.sleepRespiration = pick(ds, 'averageRespirationValue');
  day.sleepStress = pick(ds, 'avgSleepStress');
  if (day.restingHr === null) day.restingHr = pick(sl, 'restingHeartRate');

  const hs = find(hv, 'hrvSummary') || hv;
  day.hrvNight = pick(hs, 'lastNightAvg') ?? pick(sl, 'avgOvernightHrv');
  day.hrvWeek = pick(hs, 'weeklyAvg');
  day.hrvStatus = pickStr(hs, 'status') ?? pickStr(sl, 'hrvStatus');

  const vals = find(hr, 'heartRateValues') || [];
  const buckets = {}, all = [];
  if (Array.isArray(vals)) for (const p of vals) {
    if (!Array.isArray(p) || p.length < 2 || typeof p[1] !== 'number' || p[1] <= 0) continue;
    all.push(p[1]);
    const t = new Date(p[0]);
    if (isNaN(t)) continue;
    const m = Math.floor((t.getHours() * 60 + t.getMinutes()) / 10) * 10;
    (buckets[m] = buckets[m] || []).push(p[1]);
  }
  day.avgHr = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null;
  if (day.maxHr === null && all.length) day.maxHr = Math.max(...all);
  if (day.minHr === null && all.length) day.minHr = Math.min(...all);
  const curve = Object.keys(buckets).map(Number).sort((a, b) => a - b).map(m => [m, Math.round(buckets[m].reduce((a, b) => a + b, 0) / buckets[m].length)]);
  if (curve.length) day.hrCurve = curve;
  return day;
}




// ---------------------------------------------------------------- key encryption
let _aes = null;
async function aesKey() {
  if (_aes) return _aes;
  const secret = Deno.env.get('MH_KEY_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mabrouka-wearable-keys-v1|' + secret));
  _aes = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return _aes;
}
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function sealKey(plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(plain)));
  const all = new Uint8Array(iv.length + ct.length); all.set(iv); all.set(ct, iv.length);
  return 'enc1:' + b64(all);
}
async function openKey(stored) {
  if (!String(stored).startsWith('enc1:')) return { plain: stored, legacy: true };
  const all = unb64(stored.slice(5));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await aesKey(), all.slice(12));
  return { plain: new TextDecoder().decode(pt), legacy: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u || !u.user) return json({ ok: false, error: 'Sign in again.' }, 401);
    const uid = u.user.id;
    const body = await req.json().catch(() => ({}));
    const provider = body.provider || 'garmin';
    if (provider !== 'garmin') return json({ ok: false, error: 'This device is not available yet.' });

    if (body.action === 'status') {
      const { data } = await admin.from('wearable_keys').select('provider, expires_at, connected_at, display_name').eq('user_id', uid);
      return json({ ok: true, connections: data || [] });
    }
    if (body.action === 'disconnect') {
      await admin.from('wearable_keys').delete().eq('user_id', uid).eq('provider', provider);
      return json({ ok: true });
    }
    if (body.action === 'connect') {
      const key = String(body.key || '').trim().replace(/^ApiKey\s+/i, '');
      if (key.length < 16) return json({ ok: false, error: "That doesn't look like a whole key. Copy all of it from Garmin Connect." });
      const exp = new Date(body.expiresAt || '');
      if (isNaN(exp) || exp <= new Date()) return json({ ok: false, error: 'Pick the date the key expires (shown on the Garmin Personal API Key page).' });
      const api = new PersonalApi(key);
      try { await api.getToken(true); } catch (e) { return json({ ok: false, error: e.message }); }
      let name = null; try { name = (await api.profile()).displayName; } catch (_) {}
      const { error } = await admin.from('wearable_keys').upsert({ user_id: uid, provider, api_key: await sealKey(key), expires_at: exp.toISOString(), connected_at: new Date().toISOString(), display_name: name });
      if (error) return json({ ok: false, error: 'Could not save the key: ' + error.message });
      return json({ ok: true, displayName: name, expiresAt: exp.toISOString() });
    }
    if (body.action === 'sync') {
      const { data: row } = await admin.from('wearable_keys').select('*').eq('user_id', uid).eq('provider', provider).maybeSingle();
      if (!row) return json({ ok: false, code: 'not_connected', error: 'Connect your Garmin first.' });
      if (row.expires_at && new Date(row.expires_at) <= new Date()) return json({ ok: false, code: 'expired', error: 'Your Garmin key has expired. Make a new one and add it again.' });
      const dates = (Array.isArray(body.dates) ? body.dates : []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-14);
      let opened;
      try { opened = await openKey(row.api_key); } catch (_) { return json({ ok: false, code: 'bad_key', error: 'Please add your Garmin key again (it could not be unlocked).' }); }
      if (opened.legacy) await admin.from('wearable_keys').update({ api_key: await sealKey(opened.plain) }).eq('user_id', uid).eq('provider', provider); // encrypt old plain keys
      const api = new PersonalApi(opened.plain);
      try {
        const out = await api.fetchDays(dates);
        return json({ ok: true, days: out.days, displayName: row.display_name, expiresAt: row.expires_at });
      } catch (e) {
        return json({ ok: false, code: (e.status === 401 || e.status === 403) ? 'bad_key' : undefined, error: e.message });
      }
    }
    return json({ ok: false, error: 'Unknown action' }, 400);
  } catch (e) {
    console.error(e); return json({ ok: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
});
