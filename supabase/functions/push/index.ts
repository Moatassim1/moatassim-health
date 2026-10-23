// @ts-nocheck
// Mabrouka Tracker: in-app notifications (runs on Supabase as the "push" function).
// Saves notices to public.notifications; the app shows them under the bell. No phone push.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u || !u.user) return json({ ok: false, error: 'Sign in again.' }, 401);
    const me = u.user.id;
    const body = await req.json().catch(() => ({}));
    const { data: prof } = await admin.from('profiles').select('name').eq('id', me).maybeSingle();
    const myName = (prof && prof.name) || 'A friend';

    // Who gets told what.
    let recipients = [], title = '', text = '', kind = body.kind;
    const friendsOf = async () => {
      const { data } = await admin.from('friendships').select('requester, addressee').eq('status', 'accepted').or(`requester.eq.${me},addressee.eq.${me}`);
      return (data || []).map(f => f.requester === me ? f.addressee : f.requester);
    };
    if (kind === 'food') {
      const friends = await friendsOf();
      if (!friends.length) return json({ ok: true, sent: 0 });
      recipients = friends; // every friend is told (sharing is part of being friends)
      const foods = (Array.isArray(body.foods) ? body.foods : []).slice(0, 6).map(f => String(f).slice(0, 60));
      if (!foods.length) return json({ ok: true, sent: 0 });
      title = myName;
      text = `Logged ${foods.join(', ')}${body.meal ? ' for ' + String(body.meal).toLowerCase().slice(0, 20) : ''}`;
    } else if (kind === 'friend-request' || kind === 'friend-accepted') {
      const to = String(body.to || '');
      if (!(await admin.rpc('mh_knows', { a: me, b: to })).data) return json({ ok: false, error: 'Not connected' }, 403);
      recipients = [to];
      title = 'Mabrouka Tracker';
      text = kind === 'friend-request' ? `${myName} wants to be friends. Open the app to accept.` : `${myName} accepted your friend request.`;
    } else if (kind === 'test') {
      recipients = [me]; title = 'Mabrouka Tracker'; text = 'Notifications are working.';
    } else return json({ ok: false, error: 'Unknown kind' }, 400);
    if (!recipients.length) return json({ ok: true, sent: 0 });

    await admin.from('notifications').insert(recipients.map(r => ({ recipient: r, actor: me, kind, title, body: text })));

    return json({ ok: true, sent: recipients.length });
  } catch (e) {
    return json({ ok: false, error: 'Server error: ' + (e && e.message) }, 500);
  }
});
