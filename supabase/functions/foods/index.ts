// @ts-nocheck
// Mabrouka Tracker: food search relay (runs on Supabase as the "foods" function).
// Open Food Facts' search doesn't allow browsers on other sites to call it directly,
// so the app asks this function, which fetches the same search and passes the answer back.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
// Only Open Food Facts searches can be relayed.
const ALLOWED = /^https:\/\/(uk|world)\.openfoodfacts\.org\/(cgi\/search\.pl|api\/v2\/search)\?/;

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
    const r = await fetch(url, { headers: { 'User-Agent': 'MabroukaTracker/2.0 (moatassime1310@gmail.com)', Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
    const text = await r.text();
    if (!r.ok) return json({ ok: false, error: 'Open Food Facts returned ' + r.status }, 502);
    return new Response(text, { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return json({ ok: false, error: e && e.name === 'TimeoutError' ? 'Open Food Facts took too long to answer.' : 'Server error: ' + (e && e.message) }, 502);
  }
});
