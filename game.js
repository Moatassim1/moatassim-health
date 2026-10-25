// GG Gains game engine: daily points, quests, streaks, tiers, XP levels, weeks, seasons,
// chests, cosmetics, season pass and events. Pure calculations over the person's own data;
// app.js draws the screens. Points reward consistency, never extremes (see guardrails).
(function () {
  'use strict';

  // ---------------------------------------------------------------- constants
  const SEASON_EPOCH = '2026-10-19';          // Monday: Season 1 starts here
  const SEASON_WEEKS = 8;
  const TIERS = [
    { id: 'bronze', name: 'Bronze', min: 0, color: '#B4723C' },
    { id: 'silver', name: 'Silver', min: 300, color: '#9AA4AE' },
    { id: 'gold', name: 'Gold', min: 520, color: '#E3A92B' },
    { id: 'platinum', name: 'Platinum', min: 720, color: '#3FB6A8' },
    { id: 'diamond', name: 'Diamond', min: 900, color: '#4C8DF6' },
    { id: 'elite', name: 'Elite', min: 1050, color: '#9B5CF6' },
    { id: 'legend', name: 'Legend', min: 1180, color: '#E0263A' }
  ];
  const RATING_DAYS = 14;                      // tier = points over the last 14 days, so it can go down
  const FRAMES = [
    { id: 'ember', name: 'Ember', css: 'linear-gradient(135deg,#E0263A,#FF8A1F)' },
    { id: 'ice', name: 'Ice', css: 'linear-gradient(135deg,#7DD3FC,#2563EB)' },
    { id: 'toxic', name: 'Toxic', css: 'linear-gradient(135deg,#A3E635,#16A34A)' },
    { id: 'royal', name: 'Royal', css: 'linear-gradient(135deg,#C084FC,#7C3AED)' },
    { id: 'gold', name: 'Gold', css: 'linear-gradient(135deg,#FDE68A,#D97706)' },
    { id: 'shadow', name: 'Shadow', css: 'linear-gradient(135deg,#71717A,#18181B)' },
    { id: 'rainbow', name: 'Rainbow', css: 'conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)' },
    { id: 'legend', name: 'Legend', css: 'conic-gradient(#E0263A,#FF8A1F,#FDE68A,#FF8A1F,#E0263A)' }
  ];
  const TITLES = ['Protein Machine', 'Iron Will', 'Comeback Kid', 'Macro Master', 'Step Lord', 'Meal Prepper', 'Hydro Homie',
    'Consistency King', 'No Days Off', 'The Grinder', 'Clean Plate Club', 'Night Owl Logger', 'Early Bird', 'Gym Rat', 'Veg Lord', 'Tryhard'];
  const COLORS = [
    { id: 'crimson', name: 'Crimson', css: '#E0263A' }, { id: 'sunset', name: 'Sunset', css: '#F97316' }, { id: 'lime', name: 'Lime', css: '#65A30D' },
    { id: 'ocean', name: 'Ocean', css: '#0284C7' }, { id: 'violet', name: 'Violet', css: '#7C3AED' }, { id: 'gold', name: 'Gold', css: '#CA8A04' }, { id: 'pink', name: 'Pink', css: '#DB2777' }
  ];
  const REACTIONS = { fire: '🔥', muscle: '💪', gg: 'GG', laugh: '😂' };

  // Daily quest pool. Each returns [done, progressText].
  const QUESTS = [
    { id: 'protein', text: 'Hit your protein target', f: d => [d.t.p >= d.tg.p * 0.95, `${Math.round(d.t.p)} / ${Math.round(d.tg.p)} g`] },
    { id: 'within5', text: 'Land within 5% of your calories', f: d => [d.full && Math.abs(d.t.kcal - d.tg.kcal) <= d.tg.kcal * 0.05, `${Math.round(d.t.kcal)} / ${Math.round(d.tg.kcal)} kcal`] },
    { id: 'early', text: 'Log something before 10am', f: d => [d.entries.some(e => new Date(e.at || 0).getHours() < 10 && keyOf(new Date(e.at || 0)) === d.k), ''] },
    { id: 'meals3', text: 'Log breakfast, lunch and dinner', f: d => { const m = new Set(d.entries.map(e => e.meal)); const n = ['Breakfast', 'Lunch', 'Dinner'].filter(x => m.has(x)).length; return [n === 3, `${n} / 3`]; } },
    { id: 'steps10k', text: 'Walk 10,000 steps', f: d => [(d.g && d.g.steps || 0) >= 10000, `${(d.g && d.g.steps || 0).toLocaleString('en-GB')} steps`], needs: 'garmin' },
    { id: 'steps8k', text: 'Walk 8,000 steps', f: d => [(d.g && d.g.steps || 0) >= 8000, `${(d.g && d.g.steps || 0).toLocaleString('en-GB')} steps`], needs: 'garmin' },
    { id: 'water', text: 'Hit your water goal', f: d => [d.water >= d.waterGoal, `${(d.water / 1000).toFixed(1)} / ${(d.waterGoal / 1000).toFixed(1)} L`] },
    { id: 'fibre', text: 'Eat 30 g of fibre', f: d => [d.t.fib >= 30, `${Math.round(d.t.fib || 0)} / 30 g`] },
    { id: 'sugar', text: 'Keep sugar under 50 g (full day logged)', f: d => [d.full && (d.t.sug || 0) < 50, `${Math.round(d.t.sug || 0)} g so far`] },
    { id: 'veg', text: 'Eat 3 different fruits or vegetables', f: d => { const n = d.fruitVeg; return [n >= 3, `${n} / 3`]; } },
    { id: 'workout', text: 'Train today (log a workout or sauna)', f: d => [d.workout, ''] },
    { id: 'weigh', text: 'Weigh in', f: d => [d.weighed, ''] },
    { id: 'photo', text: 'Take today\'s progress photo', f: d => [d.photo, ''] },
    { id: 'vitc', text: 'Hit your vitamin C target', f: d => [(d.t.vc || 0) >= d.micro.vc, `${Math.round(d.t.vc || 0)} / ${d.micro.vc} mg`] }
  ];
  const WEEKLY = [
    { id: 'w-protein', text: 'Hit protein on 6 of 7 days', need: 6, f: s => s.protein },
    { id: 'w-log', text: 'Log a full day every day this week', need: 7, f: s => s.full },
    { id: 'w-within', text: 'Land within 10% of calories on 5 days', need: 5, f: s => s.within },
    { id: 'w-steps', text: 'Walk 8,000+ steps on 5 days', need: 5, f: s => s.steps8k, needs: 'garmin' },
    { id: 'w-train', text: 'Train on 4 days this week', need: 4, f: s => s.workout }
  ];
  // Limited-time events (dates inclusive). Badges can only be earned during the event.
  const EVENTS = [
    { id: 'halloween26', name: 'Halloween Hustle 🎃', from: '2026-10-24', to: '2026-11-08', text: 'Hit protein on 7 days', need: 7, f: s => s.protein },
    { id: 'xmas26', name: 'Christmas Survival 🎄', from: '2026-12-20', to: '2026-12-31', text: 'Stay within 10% of your calories on 8 days', need: 8, f: s => s.within },
    { id: 'ny27', name: 'New Year Reset 🎆', from: '2027-01-01', to: '2027-01-31', text: 'Log a full day on 25 days', need: 25, f: s => s.full },
    { id: 'ramadan27', name: 'Ramadan Mode 🌙', from: '2027-02-08', to: '2027-03-09', text: 'Hit protein on 20 days', need: 20, f: s => s.protein },
    { id: 'summer27', name: 'Summer Shred ☀️', from: '2027-06-01', to: '2027-07-31', text: 'Walk 8,000+ steps on 40 days', need: 40, f: s => s.steps8k }
  ];

  // ---------------------------------------------------------------- helpers
  const keyOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dOf = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addD = (k, n) => { const d = dOf(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((dOf(b) - dOf(a)) / 864e5);
  const mondayOf = k => { const d = dOf(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return keyOf(d); };
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = hash(seed) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const weekId = k => mondayOf(k);
  const seasonOf = k => Math.max(1, Math.floor(diffDays(SEASON_EPOCH, mondayOf(k)) / (SEASON_WEEKS * 7)) + 1);
  const seasonStart = n => addD(SEASON_EPOCH, (n - 1) * SEASON_WEEKS * 7);
  const tierFor = rating => { let t = TIERS[0]; for (const x of TIERS) if (rating >= x.min) t = x; return t; };
  const nextTier = t => TIERS[TIERS.indexOf(t) + 1] || null;
  // XP needed to go from level n to n+1, and level from total XP (level 1..100).
  const xpForLevel = n => 150 + n * 25;
  function levelOf(xp) { let lv = 1, need = xpForLevel(1), left = xp; while (lv < 100 && left >= need) { left -= need; lv++; need = xpForLevel(lv); } return { level: lv, into: left, need: lv >= 100 ? 0 : need }; }
  const gradeOf = pts => pts >= 85 ? 'S' : pts >= 65 ? 'A' : pts >= 45 ? 'B' : pts >= 25 ? 'C' : 'D';

  // ---------------------------------------------------------------- engine
  window.GGGame = function (ctx) {
    // ctx: { P, uid, today, dayEntries, totalsOf, targets, waterGoal, microTargets, garmin(k), photoDays(), BUILTIN, weights() }
    const cache = new Map();
    const G = () => { const p = ctx.P(); return p.game || (p.game = {}); };

    function dayData(k) {
      const p = ctx.P(), entries = ctx.dayEntries(k), t = ctx.totalsOf(entries), tg = ctx.targets(k), meta = p.dayMeta[k] || {};
      const g = ctx.garmin(k);
      const fv = new Set(entries.filter(e => { const f = ctx.BUILTIN.find(b => b.id === e.foodId); return f && /Fruit|Vegetable/i.test(f.cat || ''); }).map(e => e.foodId)).size;
      const full = !!meta.complete || (k < ctx.today() && t.kcal >= tg.kcal * 0.5 && entries.length >= 2);
      return { k, entries, t, tg, full, g, water: meta.water || 0, waterGoal: ctx.waterGoal(),
        workout: (meta.ex || []).length > 0 || !!(g && (g.activities || []).length), weighed: p.weights[k] != null, photo: ctx.photoDays().has(k),
        fruitVeg: fv, micro: ctx.microTargets() };
    }
    function questsFor(k) {
      const hasG = !!ctx.garmin(k) || !!ctx.garmin(addD(k, -1));
      const pool = QUESTS.filter(q => q.needs !== 'garmin' || hasG);
      const r = rng('q|' + k + '|' + ctx.uid()), picks = [];
      const bag = pool.slice();
      while (picks.length < 3 && bag.length) picks.push(bag.splice(Math.floor(r() * bag.length), 1)[0]);
      return picks;
    }
    // Points for one day, with a breakdown. Guardrails: eating far below target or crash-losing earns nothing.
    function scoreDay(k) {
      const d = dayData(k), tg = d.tg, t = d.t, items = [];
      const add = (id, label, pts, ok, note) => items.push({ id, label, pts: ok ? pts : 0, max: pts, ok: !!ok, note: note || '' });
      const any = d.entries.length > 0;
      const tooLow = d.full && t.kcal < tg.kcal * 0.75;
      add('logged', 'Logged a full day', 10, d.full);
      add('calories', 'Within 10% of your calories', 15, d.full && !tooLow && Math.abs(t.kcal - tg.kcal) <= tg.kcal * 0.1, tooLow ? 'Too far under target: no points for under-eating' : `${Math.round(t.kcal)} / ${Math.round(tg.kcal)} kcal`);
      add('protein', 'Hit your protein', 15, any && t.p >= tg.p * 0.95, `${Math.round(t.p)} / ${Math.round(tg.p)} g`);
      add('steps', '8,000+ steps', 10, (d.g && d.g.steps || 0) >= 8000, d.g && d.g.steps != null ? `${d.g.steps.toLocaleString('en-GB')} steps` : 'No step data');
      add('workout', 'Trained', 10, d.workout);
      add('water', 'Hit your water goal', 5, d.water >= d.waterGoal);
      add('weigh', 'Weighed in', 5, d.weighed);
      const qs = questsFor(k).map(q => { const [ok, prog] = q.f(d); return { ...q, ok, prog }; });
      qs.forEach(q => add('q-' + q.id, 'Quest: ' + q.text, 10, q.ok, q.prog));
      let base = items.reduce((a, x) => a + x.pts, 0);
      return { k, d, items, quests: qs, base, tooLow };
    }
    const dayActive = k => { const e = ctx.dayEntries(k); return e.length > 0; };
    // Everything that depends on history, computed once per render.
    function compute() {
      const today = ctx.today();
      const sig = today + '|' + ctx.sig();
      if (cache.has(sig)) return cache.get(sig);
      cache.clear();
      const g = G(), firstKey = ctx.firstDay() || today;
      const start = firstKey < addD(today, -400) ? addD(today, -400) : firstKey;
      const days = {}; let k = start;
      // streaks with freezes; comeback bonus after 3+ empty days
      let logStreak = 0, protStreak = 0, gap = 0, comeback = 0;
      const used = new Set(g.freezesUsed || []);
      let freezes = (g.freezesEarned || 0) - used.size;
      while (k <= today) {
        const s = scoreDay(k), active = dayActive(k);
        let mult = 1;
        if (active && gap >= 3) comeback = 3;
        if (active && comeback > 0) { mult = 2; comeback--; }
        const streakBonus = Math.min(10, logStreak);
        const pts = active ? Math.round(s.base * mult + (s.d.full ? streakBonus : 0)) : 0;
        // streak bookkeeping (today doesn't break a streak until it's over)
        const fullOk = s.d.full, protOk = s.items.find(x => x.id === 'protein').ok;
        if (k < today) {
          if (fullOk) logStreak++;
          else if (logStreak > 0 && (used.has(k) || freezes > 0)) { if (!used.has(k)) { used.add(k); freezes--; } }
          else logStreak = 0;
          protStreak = protOk ? protStreak + 1 : (used.has(k) ? protStreak : 0);
        }
        gap = active ? 0 : gap + 1;
        days[k] = { ...s, pts, mult, streakBonus: s.d.full ? streakBonus : 0 };
        k = addD(k, 1);
      }
      const todayS = days[today];
      const curLog = logStreak + (todayS && todayS.d.full ? 1 : 0);
      const curProt = protStreak + (todayS && todayS.items.find(x => x.id === 'protein').ok ? 1 : 0);
      // freezes consumed this pass are saved so they stay consumed
      if (used.size !== (g.freezesUsed || []).length) { g.freezesUsed = [...used].sort(); ctx.save(); }
      const sum = (a, b) => { let n = 0; for (let x = a; x <= b; x = addD(x, 1)) n += (days[x] ? days[x].pts : 0); return n; };
      const wk = weekId(today), lastWk = addD(wk, -7);
      const weekPts = sum(wk, today) + weekBonus(wk, days);
      const lastWeekPts = sum(lastWk, addD(wk, -1)) + weekBonus(lastWk, days);
      const season = seasonOf(today), sStart = seasonStart(season);
      let seasonPts = sum(sStart > start ? sStart : start, today);
      for (let w = sStart; w < wk; w = addD(w, 7)) seasonPts += weekBonus(w, days);
      seasonPts += weekBonus(wk, days);
      const rating = sum(addD(today, -(RATING_DAYS - 1)), today);
      const tier = tierFor(rating);
      // XP never drops: all points ever + quest/chest bonuses
      let xp = 0; for (const x in days) xp += days[x].pts;
      xp += Object.values(g.chests || {}).reduce((a, c) => a + (c.xp || 0), 0) + (g.bonusXp || 0);
      const lv = levelOf(xp);
      const out = { today, days, todayS, weekPts, lastWeekPts, wk, season, seasonStart: sStart, seasonEnd: addD(seasonStart(season + 1), -1), seasonPts, rating, tier, next: nextTier(tier),
        xp, ...lv, logStreak: curLog, protStreak: curProt, freezes: Math.max(0, (g.freezesEarned || 0) - used.size),
        onFire: [0, 1, 2].every(i => { const x = days[addD(today, -i - (todayS && todayS.d.full ? 0 : 1))]; return x && x.pts >= 65; }),
        weekly: weeklyQuest(wk, days), events: eventsFor(today, days), comebackActive: todayS && todayS.mult === 2 };
      cache.set(sig, out);
      return out;
    }
    function weekStats(from, to, days) {
      const s = { protein: 0, full: 0, within: 0, steps8k: 0, workout: 0 };
      for (let x = from; x <= to; x = addD(x, 1)) {
        const d = days[x]; if (!d) continue;
        const it = id => (d.items.find(i => i.id === id) || {}).ok;
        if (it('protein')) s.protein++; if (d.d.full) s.full++; if (it('calories')) s.within++; if (it('steps')) s.steps8k++; if (it('workout')) s.workout++;
      }
      return s;
    }
    // Weekly weight progress bonus: up to 50 points, only for a safe rate (no reward for crash dieting).
    function weekBonus(wk, days) {
      const end = addD(wk, 6); if (end >= ctx.today()) return 0;
      const ws = ctx.weights(), keys = Object.keys(ws).sort();
      const before = keys.filter(x => x < wk && x >= addD(wk, -10)), inWeek = keys.filter(x => x >= wk && x <= end);
      if (!before.length || inWeek.length < 2) return 0;
      const a = ws[before[before.length - 1]], b = inWeek.slice(-3).reduce((s, x) => s + ws[x], 0) / Math.min(3, inWeek.length);
      const goal = ctx.goal(), change = b - a, pct = Math.abs(change) / a * 100;
      if (goal === 'lose') return change < 0 ? Math.round(50 * Math.min(1, pct / 0.5)) : 0;   // full bonus from 0.5%/week; nothing extra beyond
      if (goal === 'gain') return change > 0 ? Math.round(50 * Math.min(1, pct / 0.25)) : 0;
      return Math.abs(change) <= 0.5 ? 50 : 20;
    }
    function weeklyQuest(wk, days) {
      const hasG = Object.keys(days).slice(-14).some(x => ctx.garmin(x));
      const pool = WEEKLY.filter(q => q.needs !== 'garmin' || hasG);
      const q = pool[Math.floor(rng('w|' + wk + '|' + ctx.uid())() * pool.length)];
      const s = weekStats(wk, addD(wk, 6), days), have = q.f(s);
      return { ...q, have, done: have >= q.need };
    }
    function eventsFor(today, days) {
      return EVENTS.filter(e => today >= addD(e.from, -7) && today <= e.to).map(e => {
        const live = today >= e.from, s = weekStats(e.from, today < e.to ? today : e.to, days), have = e.f(s);
        return { ...e, live, have, done: have >= e.need };
      });
    }

    // ---------------------------------------------------------------- chests and cosmetics
    // One chest per completed day; the reward is fixed by the day (no rerolling).
    function chestReward(k) {
      const r = rng('c|' + k + '|' + ctx.uid())(), g = G(), own = g.cosmetics || {};
      const roll = (list, kind) => { const left = list.filter(x => !(own[kind] || []).includes(x.id || x)); return left.length ? left[Math.floor(rng('cx|' + k + kind)() * left.length)] : null; };
      if (r < 0.12) return { kind: 'freeze', label: '🧊 Streak freeze', text: 'Saves your streak if you miss a day.' };
      if (r < 0.22) { const f = roll(FRAMES, 'frames'); if (f) return { kind: 'frame', id: f.id, label: '🖼️ ' + f.name + ' frame', text: 'A new frame for your profile picture.' }; }
      if (r < 0.32) { const t = roll(TITLES.map(x => ({ id: x })), 'titles'); if (t) return { kind: 'title', id: t.id, label: '🏷️ Title: ' + t.id, text: 'Shows under your name on the ladder.' }; }
      if (r < 0.40) { const c = roll(COLORS, 'colors'); if (c) return { kind: 'color', id: c.id, label: '🎨 ' + c.name + ' name colour', text: 'Your name in a new colour on the ladder.' }; }
      const xp = 50 + Math.floor(rng('cxp|' + k)() * 11) * 10;
      return { kind: 'xp', xp, label: `⚡ +${xp} XP`, text: 'Bonus XP towards your next level.' };
    }
    function chestsReady(comp) {
      const g = G(), opened = g.chests || {}, out = [];
      for (const k in comp.days) if (comp.days[k].d.full && !opened[k] && k >= addD(comp.today, -6)) out.push(k);
      return out.sort();
    }
    function grant(rw) {
      const g = G(); g.cosmetics = g.cosmetics || {};
      const push = (kind, id) => { const a = g.cosmetics[kind] || (g.cosmetics[kind] = []); if (!a.includes(id)) a.push(id); };
      if (rw.kind === 'freeze') g.freezesEarned = (g.freezesEarned || 0) + 1;
      if (rw.kind === 'frame') push('frames', rw.id);
      if (rw.kind === 'title') push('titles', rw.id);
      if (rw.kind === 'color') push('colors', rw.id);
      if (rw.kind === 'xp') g.bonusXp = (g.bonusXp || 0) + 0; // chest XP is counted from g.chests
    }
    function openChest(k) {
      const g = G(); g.chests = g.chests || {};
      if (g.chests[k]) return g.chests[k];
      const rw = chestReward(k); grant(rw);
      g.chests[k] = { ...rw, at: Date.now() };
      cache.clear(); ctx.save();
      return g.chests[k];
    }
    // Season pass: 30 free levels, one per 60 season points.
    const PASS_STEP = 60;
    function passRewards(season) {
      const out = [];
      for (let i = 1; i <= 30; i++) {
        const r = rng('p|' + season + '|' + i)();
        let rw;
        if (i === 30) rw = { kind: 'frame', id: 'legend', label: '🖼️ Legend frame' };
        else if (i === 20) rw = { kind: 'title', id: `Season ${season} Grinder`, label: `🏷️ Title: Season ${season} Grinder` };
        else if (i % 5 === 0) { const f = FRAMES[(season * 3 + i) % (FRAMES.length - 1)]; rw = { kind: 'frame', id: f.id, label: '🖼️ ' + f.name + ' frame' }; }
        else if (r < 0.25) rw = { kind: 'freeze', label: '🧊 Streak freeze' };
        else if (r < 0.45) { const c = COLORS[Math.floor(r * 100) % COLORS.length]; rw = { kind: 'color', id: c.id, label: '🎨 ' + c.name + ' name' }; }
        else if (r < 0.6) { const t = TITLES[Math.floor(r * 1000) % TITLES.length]; rw = { kind: 'title', id: t, label: '🏷️ ' + t }; }
        else rw = { kind: 'xp', xp: 100, label: '⚡ +100 XP' };
        out.push({ level: i, need: i * PASS_STEP, ...rw });
      }
      return out;
    }
    function passState(comp) {
      const g = G(), claimed = (g.pass && g.pass[comp.season]) || [];
      const list = passRewards(comp.season).map(r => ({ ...r, unlocked: comp.seasonPts >= r.need, claimed: claimed.includes(r.level) }));
      return { list, level: Math.min(30, Math.floor(comp.seasonPts / PASS_STEP)), claimable: list.filter(r => r.unlocked && !r.claimed).length };
    }
    function claimPass(season, level) {
      const g = G(); g.pass = g.pass || {}; const a = g.pass[season] || (g.pass[season] = []);
      if (a.includes(level)) return null;
      const rw = passRewards(season).find(r => r.level === level); if (!rw) return null;
      a.push(level); grant(rw); if (rw.kind === 'xp') g.bonusXp = (g.bonusXp || 0) + rw.xp;
      cache.clear(); ctx.save(); return rw;
    }
    function claimEvent(ev) {
      const g = G(); g.badges = g.badges || [];
      if (g.badges.includes(ev.id)) return false;
      g.badges.push(ev.id); g.bonusXp = (g.bonusXp || 0) + 250; cache.clear(); ctx.save(); return true;
    }
    function claimWeekly(wq, wk) {
      const g = G(); g.weeklyDone = g.weeklyDone || [];
      if (g.weeklyDone.includes(wk)) return false;
      g.weeklyDone.push(wk); g.bonusXp = (g.bonusXp || 0) + 150; g.freezesEarned = (g.freezesEarned || 0) + 1; cache.clear(); ctx.save(); return true;
    }
    // What friends see (kept small).
    function publicStats(comp) {
      const g = G(), eq = g.equipped || {};
      return { v: 1, wk: comp.wk, wp: comp.weekPts, lwk: addD(comp.wk, -7), lwp: comp.lastWeekPts, s: comp.season, sp: comp.seasonPts, r: comp.rating, t: comp.tier.id,
        lv: comp.level, ls: comp.logStreak, ps: comp.protStreak, fire: comp.onFire ? 1 : 0, td: comp.todayS ? comp.todayS.pts : 0,
        fr: eq.frame || null, ti: eq.title || null, nc: eq.color || null, hw: g.hideWeight ? 1 : 0, b: (g.badges || []).slice(-6) };
    }

    return { compute, scoreDay, questsFor, openChest, chestsReady, chestReward, passState, claimPass, claimEvent, claimWeekly, publicStats,
      TIERS, FRAMES, TITLES, COLORS, REACTIONS, EVENTS, tierFor, nextTier, gradeOf, levelOf, seasonOf, weekId, addD, diffDays, invalidate: () => cache.clear() };
  };
})();
