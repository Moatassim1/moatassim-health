// @ts-nocheck
// GG Gains: food search relay (runs on Supabase as the "foods" function).
// Open Food Facts doesn't let browsers on other sites call its search, so the app asks
// this function. Answers are kept for a day in public.food_cache and shared by everyone,
// which keeps the app well inside Open Food Facts' limit of ~10 searches a minute.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const raw = (text) => new Response(text, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
const ALLOWED = /^https:\/\/(uk|world)\.openfoodfacts\.org\/(cgi\/search\.pl|api\/v2\/search)\?/;
const FRESH_MS = 24 * 3600 * 1000;

// Same search written differently = same cache entry.
function cacheKey(url) {
  const u = new URL(url);
  const p = [...u.searchParams.entries()].map(([k, v]) => [k, k === 'search_terms' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : v]).sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
  return u.host + u.pathname + '?' + p.map(([k, v]) => k + '=' + v).join('&');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u || !u.user) return json({ ok: false, error: 'Sign in again.' }, 401);
    const body = await req.json().catch(() => ({}));
    const url = String(body.url || '');
    if (!ALLOWED.test(url)) return json({ ok: false, error: 'Not allowed' }, 400);

    const key = cacheKey(url);
    const { data: hit } = await admin.from('food_cache').select('body, fetched_at').eq('key', key).maybeSingle();
    if (hit && Date.now() - new Date(hit.fetched_at).getTime() < FRESH_MS) return raw(hit.body);

    let r, text;
    try {
      r = await fetch(url, { headers: { 'User-Agent': 'GGGains/2.0 (moatassime1310@gmail.com)', Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
      text = await r.text();
    } catch (e) {
      if (hit) return raw(hit.body); // older answer is better than none
      return json({ ok: false, error: e && e.name === 'TimeoutError' ? 'Open Food Facts took too long to answer. Try again in a moment.' : 'Could not reach Open Food Facts.' }, 502);
    }
    if (!r.ok) {
      if (hit) return raw(hit.body);
      return json({ ok: false, error: r.status === 429 || r.status === 503 ? 'Open Food Facts is busy. Try again in a minute.' : 'Open Food Facts returned an error (' + r.status + ').' }, 502);
    }
    await admin.from('food_cache').upsert({ key, body: text, fetched_at: new Date().toISOString() });
    // Now and then, clear out entries older than a week.
    if (Math.random() < 0.02) await admin.from('food_cache').delete().lt('fetched_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());
    return raw(text);
  } catch (e) {
    console.error(e); return json({ ok: false, error: 'Something went wrong on the server. Please try again.' }, 500);
  }
});
