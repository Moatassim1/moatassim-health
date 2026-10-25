// GG Gains: bridge to the iPhone/Android app shell (Capacitor). In a normal browser this does nothing.
(function () {
  'use strict';
  const C = window.Capacitor;
  const isApp = !!(C && C.isNativePlatform && C.isNativePlatform());
  const SITE = 'https://moatassim1.github.io/moatassim-health/';
  const SCHEME = 'com.gggains.app';
  const plug = n => { if (!isApp) return null; try { return (C.Plugins && C.Plugins[n]) || (C.registerPlugin ? C.registerPlugin(n) : null); } catch (_) { return null; } };
  const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b); });

  const N = {
    isApp,
    platform: isApp && C.getPlatform ? C.getPlatform() : 'web',
    authRedirect: SCHEME + '://login-callback',
    // Web pages (privacy, terms, sign-in providers) open in an in-app browser sheet.
    async openUrl(url) {
      const abs = new URL(url, isApp ? SITE : location.href).href;
      const B = plug('Browser');
      if (B) return B.open({ url: abs, presentationStyle: 'popover' });
      window.open(abs, '_blank', 'noopener');
    },
    async closeBrowser() { const B = plug('Browser'); try { if (B) await B.close(); } catch (_) {} },
    async share({ title, text, url } = {}) {
      const S = plug('Share');
      if (S) { try { await S.share({ title, text, url, dialogTitle: title || 'Share' }); return true; } catch (_) { return false; } }
      if (navigator.share) { try { await navigator.share({ title, text, url }); return true; } catch (_) { return false; } }
      return false;
    },
    // Save or share a file (backup, transformation video): writes it to the app's cache, then opens the share sheet
    // ("Save to Files", "Save Video", WhatsApp, Instagram…).
    async shareFile(blob, name, title) {
      const F = plug('Filesystem'), S = plug('Share');
      if (!F || !S) return false;
      const w = await F.writeFile({ path: name, data: await blobToB64(blob), directory: 'CACHE' });
      try { await S.share({ title: title || name, files: [w.uri], dialogTitle: title || 'Save or share' }); } catch (_) {}
      return true;
    },
    // Daily food-log reminder as a real phone notification.
    async setReminder(hm, on) {
      const L = plug('LocalNotifications'); if (!L) return { ok: false, error: 'Not available' };
      try { await L.cancel({ notifications: [{ id: 1001 }] }); } catch (_) {}
      if (!on) return { ok: true };
      let p = await L.checkPermissions().catch(() => ({}));
      if (p.display !== 'granted') p = await L.requestPermissions().catch(() => ({}));
      if (p.display !== 'granted') return { ok: false, error: 'Notifications are off for GG Gains. Turn them on in iPhone Settings › Notifications › GG Gains.' };
      const [h, m] = String(hm || '21:00').split(':').map(Number);
      await L.schedule({ notifications: [{ id: 1001, title: 'GG Gains', body: 'Log today\'s food to keep your streak 🔥', schedule: { on: { hour: h, minute: m }, allowWhileIdle: true } }] });
      return { ok: true };
    },
    // Sign in with Apple (iPhone only): returns { idToken, name, email }.
    // Secure sign-in sheet that returns to the app (ASWebAuthenticationSession). Resolves with the return URL.
    async webAuth(url, scheme) { const G = plug('GGNative'); if (!G) throw new Error('Not available'); return (await G.webAuth({ url, scheme: scheme || SCHEME })).url; },
    canWebAuth() { return !!plug('GGNative'); },
    async googleSignIn(clientId) { const G = plug('GGNative'); return G.googleSignIn({ clientId }); },
    async appleSignIn() { const G = plug('GGNative'); if (!G) throw new Error('Not available'); return G.signInWithApple({}); },
    // Apple Health: steps, walking km and active calories per day.
    health: {
      async available() { const G = plug('GGNative'); if (!G || N.platform !== 'ios') return false; try { return !!(await G.healthAvailable()).available; } catch (_) { return false; } },
      async authorize() { const G = plug('GGNative'); return G.healthAuthorize(); },
      async days(n) { const G = plug('GGNative'); return ((await G.healthDays({ days: n || 7 })) || {}).days || {}; }
    },
    onAppUrl(cb) { const A = plug('App'); if (A) A.addListener('appUrlOpen', e => cb(e && e.url)); },
    onResume(cb) { const A = plug('App'); if (A) A.addListener('resume', cb); }
  };
  window.MHNative = N;
  if (!isApp) return;

  document.documentElement.classList.add('is-app', 'is-' + N.platform);
  // Coming back from Google/X sign-in: the login page sends us back to com.gggains.app://login-callback#access_token=…
  N.onAppUrl(async url => {
    if (!url || url.indexOf(SCHEME + '://') !== 0) return;
    const frag = url.split('#')[1] || url.split('?')[1] || '';
    await N.closeBrowser();
    if (/access_token=|error_description=/.test(frag)) { location.replace(location.pathname + '#' + frag); location.reload(); }
  });
  // Links that would leave the app (privacy, terms, outside sites) open in the in-app browser instead.
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') || href.startsWith('javascript:')) return;
    const external = /^https?:/i.test(href) && !href.startsWith(location.origin);
    if (a.target === '_blank' || external || /\.(html|ics)(\?|#|$)/.test(href)) { e.preventDefault(); N.openUrl(href); }
  }, true);
  // Status bar text matches the app's theme.
  const SB = plug('StatusBar');
  const syncBar = () => { try { SB && SB.setStyle({ style: document.documentElement.dataset.theme === 'dark' ? 'DARK' : 'LIGHT' }); } catch (_) {} };
  if (SB) { syncBar(); new MutationObserver(syncBar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); }
})();
