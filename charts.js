// Small SVG chart helpers (no libraries needed).
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function niceMax(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
  }

  function frame(W, H, pad, yMax, yMin, fmt, ticks = 4) {
    let s = '';
    for (let i = 0; i <= ticks; i++) {
      const v = yMin + (yMax - yMin) * i / ticks;
      const y = H - pad.b - (H - pad.t - pad.b) * i / ticks;
      s += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}" stroke-width="${i === 0 ? 1 : .6}" ${i ? 'stroke-dasharray="2 4"' : ''}/>`;
      s += `<text class="tick" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${esc(fmt(v))}</text>`;
    }
    return s;
  }

  function xLabels(labels, x, H, pad, every) {
    let s = '';
    labels.forEach((l, i) => {
      if (i % every !== 0 && i !== labels.length - 1) return;
      s += `<text class="tick" x="${x(i)}" y="${H - pad.b + 16}" text-anchor="middle">${esc(l)}</text>`;
    });
    return s;
  }

  // Bars, optionally stacked. series: [{label, color, values[]}]
  window.barChart = function (o) {
    const W = o.width || 760, H = o.height || 220;
    const pad = { t: 12, r: (o.line2 || o.padRight) ? 50 : 12, b: 26, l: 46 };
    const L2 = o.line2 ? [].concat(o.line2) : [];
    const n = o.labels.length;
    const totals = o.labels.map((_, i) => o.series.reduce((a, s) => a + (s.values[i] || 0), 0));
    const extra = [o.target || 0, ...(o.line ? o.line.values.filter(v => v != null) : [0])];
    const yMax = niceMax(Math.max(...totals, ...extra) * 1.05);
    const fmt = o.yFmt || (v => Math.round(v).toLocaleString('en-GB'));
    const iw = (W - pad.l - pad.r) / n;
    const bw = Math.max(3, Math.min(34, iw * .62));
    const x = i => pad.l + iw * i + iw / 2;
    const y = v => H - pad.b - (H - pad.t - pad.b) * v / yMax;
    let s = frame(W, H, pad, yMax, 0, fmt);
    o.labels.forEach((lab, i) => {
      let acc = 0;
      const tipParts = [];
      o.series.forEach(se => {
        const v = se.values[i] || 0;
        if (v > 0) {
          const y0 = y(acc), y1 = y(acc + v);
          s += `<rect x="${x(i) - bw / 2}" y="${y1}" width="${bw}" height="${Math.max(0, y0 - y1)}" fill="${se.color}" rx="${o.series.length === 1 ? 3 : 1}"/>`;
        }
        acc += v;
        if (se.label) tipParts.push(`${se.label}: ${(o.tipFmt || fmt)(v)}`);
      });
      const tip = [o.tipLabels ? o.tipLabels[i] : lab, ...(o.series.length > 1 ? tipParts : [(o.tipFmt || fmt)(totals[i]) + (o.unit ? ' ' + o.unit : '')])];
      if (o.line && o.line.values[i] != null) tip.push(`${o.line.label}: ${fmt(o.line.values[i])}`);
      L2.forEach(l => { if (l.values[i] != null) tip.push(`${l.label}: ${l.fmt ? l.fmt(l.values[i]) : l.values[i]}`); });
      s += `<rect x="${pad.l + iw * i}" y="${pad.t}" width="${iw}" height="${H - pad.t - pad.b}" fill="transparent" data-tip="${esc(tip.join('\n'))}"/>`;
    });
    if (o.target) s += `<line class="target" x1="${pad.l}" x2="${W - pad.r}" y1="${y(o.target)}" y2="${y(o.target)}"/>`;
    if (o.line) {
      let d = '', pen = false;
      o.line.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i) + ' ' + y(v) + ' '; pen = true; });
      s += `<path d="${d}" fill="none" stroke="${o.line.color}" stroke-width="2" stroke-linejoin="round" pointer-events="none"/>`;
      o.line.values.forEach((v, i) => { if (v != null) s += `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="${o.line.color}" pointer-events="none"/>`; });
    }
    if (L2.length) {
      // Lines on their own scale (right-hand axis), joined across days with no value.
      const vals = L2.flatMap(l => l.values).filter(v => v != null);
      if (vals.length) {
        let lo = Math.min(...vals), hi = Math.max(...vals);
        const span = Math.max(2, hi - lo);
        lo = Math.floor(lo - span * .35); hi = Math.ceil(hi + span * .35);
        if (L2[0].min != null) lo = Math.max(L2[0].min, lo);
        const y2 = v => H - pad.b - (H - pad.t - pad.b) * (v - lo) / (hi - lo);
        for (let i = 0; i <= 4; i++) {
          const v = lo + (hi - lo) * i / 4;
          s += `<text class="tick" x="${W - pad.r + 8}" y="${y2(v) + 4}" text-anchor="start" fill="${L2[0].color}">${esc(((hi - lo) > 20 ? Math.round(v) : Math.round(v * 10) / 10) + (i === 4 ? ' ' + (L2[0].unit || '') : ''))}</text>`;
        }
        L2.forEach(l => {
          const pts = l.values.map((v, i) => v == null ? null : [x(i), y2(v)]).filter(Boolean);
          if (pts.length > 1) s += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="${l.color}" stroke-width="2.2" stroke-dasharray="${l.dash || ''}" stroke-linejoin="round" pointer-events="none"/>`;
          pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="${l.r || 4}" fill="${l.hollow === false ? l.color : 'var(--surface)'}" stroke="${l.color}" stroke-width="2.2" pointer-events="none"/>`; });
        });
      }
    }
    s += xLabels(o.labels, x, H, pad, Math.max(1, Math.ceil(n / 12)));
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'chart')}">${s}</svg></div>`;
  };

  // Lines. series: [{label, color, values[] (null = gap)}]
  window.lineChart = function (o) {
    const W = o.width || 760, H = o.height || 200;
    const pad = { t: 12, r: 12, b: 26, l: 46 };
    const n = o.labels.length;
    const all = o.series.flatMap(s => s.values).filter(v => v != null);
    if (!all.length) return `<div class="chart muted small" style="padding:24px 0">No data for this period yet.</div>`;
    let lo = o.yMin != null ? o.yMin : Math.min(...all), hi = o.yMax != null ? o.yMax : Math.max(...all);
    if (o.yMin == null) { const span = Math.max(1, hi - lo); lo = Math.max(0, Math.floor((lo - span * .25) / 5) * 5); }
    if (o.yMax == null) hi = niceMax(hi * 1.04);
    if (hi <= lo) hi = lo + 1;
    const fmt = o.yFmt || (v => Math.round(v).toLocaleString('en-GB'));
    const x = i => n === 1 ? (pad.l + W - pad.r) / 2 : pad.l + (W - pad.l - pad.r) * i / (n - 1);
    const y = v => H - pad.b - (H - pad.t - pad.b) * (v - lo) / (hi - lo);
    let s = frame(W, H, pad, hi, lo, fmt);
    o.series.forEach(se => {
      let d = '', pen = false;
      se.values.forEach((v, i) => { if (v == null) { if (!se.connect) pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' '; pen = true; });
      if (o.area && o.series.length === 1) {
        const pts = se.values.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean);
        if (pts.length > 1) s += `<path d="M${pts[0][0]} ${H - pad.b} ${pts.map(p => 'L' + p[0] + ' ' + p[1]).join(' ')} L${pts[pts.length - 1][0]} ${H - pad.b} Z" fill="${se.color}" opacity=".12"/>`;
      }
      s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="${se.width || 2}" stroke-dasharray="${se.dash || ''}" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (se.dots || (n <= 60 && se.dots !== false)) se.values.forEach((v, i) => { if (v != null) s += `<circle cx="${x(i)}" cy="${y(v)}" r="${se.dots ? 3.6 : 2.6}" fill="${se.color}"/>`; });
    });
    if (o.target != null) s += `<line class="target" x1="${pad.l}" x2="${W - pad.r}" y1="${y(o.target)}" y2="${y(o.target)}"/>`;
    (o.markers || []).forEach(m => { s += `<line x1="${x(m.i)}" x2="${x(m.i)}" y1="${pad.t}" y2="${H - pad.b}" stroke="var(--faint)" stroke-dasharray="2 3"/>${m.label ? `<text class="tick" x="${x(m.i) + 4}" y="${pad.t + 10}">${esc(m.label)}</text>` : ''}`; });
    const step = n > 1 ? (W - pad.l - pad.r) / (n - 1) : W;
    o.labels.forEach((lab, i) => {
      const tip = [o.tipLabels ? o.tipLabels[i] : lab, ...o.series.map(se => `${se.label ? se.label + ': ' : ''}${se.values[i] == null ? '–' : (o.tipFmt || fmt)(se.values[i])}`)];
      s += `<rect x="${x(i) - step / 2}" y="${pad.t}" width="${step}" height="${H - pad.t - pad.b}" fill="transparent" data-tip="${esc(tip.join('\n'))}"/>`;
    });
    s += xLabels(o.labels, x, H, pad, o.labelEvery || Math.max(1, Math.ceil(n / 12)));
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'chart')}">${s}</svg></div>`;
  };

  // Tooltip for any element with data-tip.
  let tipEl = null;
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { if (tipEl) tipEl.hidden = true; return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; document.body.appendChild(tipEl); }
    tipEl.hidden = false;
    tipEl.innerHTML = t.getAttribute('data-tip').split('\n').map((l, i) => i ? esc(l) : `<b>${esc(l)}</b>`).join('<br>');
    const r = tipEl.getBoundingClientRect();
    let left = e.clientX + 14, top = e.clientY + 14;
    if (left + r.width > innerWidth - 8) left = e.clientX - r.width - 14;
    if (top + r.height > innerHeight - 8) top = e.clientY - r.height - 14;
    tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  });
})();
