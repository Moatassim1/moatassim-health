// GG Gains progress photos. Photos are stored ONLY on this device (IndexedDB), never uploaded.
// MHPhotos: days(), get(k), put(k, blob), del(k), list(from, to), capture({ ghost }), makeVideo(opts, onProgress)
(function () {
  'use strict';
  const DB = 'gg-photos', STORE = 'photos';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    // Ask the browser not to clear these when space runs low.
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
    return dbp;
  }
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode), st = t.objectStore(STORE); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  const get = k => tx('readonly', st => st.get(k)).then(r => r || null);
  const put = (k, blob) => tx('readwrite', st => st.put({ blob, at: Date.now() }, k));
  const del = k => tx('readwrite', st => st.delete(k));
  const keys = () => tx('readonly', st => st.getAllKeys()).then(r => (r || []).sort());
  async function list(from, to) { const ks = (await keys()).filter(k => (!from || k >= from) && (!to || k <= to)); const out = []; for (const k of ks) { const r = await get(k); if (r) out.push({ k, blob: r.blob }); } return out; }

  // Shrink to max 1440 px on the long side, JPEG ~80%, so a year of photos stays small.
  async function shrink(src) {
    const img = await loadImg(src instanceof Blob ? URL.createObjectURL(src) : src);
    const s = Math.min(1, 1440 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
  }
  const loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

  // Camera with a see-through "ghost" of the last photo, so every photo lines up.
  // Shows the whole camera frame (no crop/zoom), lets you flip, set a timer, zoom out on phones with a wide lens,
  // review the shot (Retake / Use photo), and close with X, Cancel or the phone's back gesture.
  const IC = {
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    flip: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><path d="M9.5 13.5a2.8 2.8 0 0 1 5-1.6M14.5 12.2V10M14.6 14a2.8 2.8 0 0 1-5 1.6M9.5 15.8V18"/></svg>',
    up: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 16l5-5 4 4 2-2 5 5"/><circle cx="15.5" cy="8.5" r="1.5"/></svg>',
    timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>'
  };
  function capture({ ghost } = {}) {
    return new Promise(resolve => {
      let stream = null, facing = 'environment', dz = 1, hw = null, timer = 0, done = false, cams = [], busy = false, shot = null, countdown = null;
      const box = document.createElement('div'); box.className = 'pcam';
      box.innerHTML = `<div class="pcam-stage"><video playsinline muted autoplay></video>${ghost ? `<img class="pcam-ghost" src="${ghost}" alt="">` : ''}<img class="pcam-review" alt="" hidden></div>
        <div class="pcam-top"><button class="pcam-ic" data-p="close" aria-label="Close">${IC.x}</button><span class="pcam-title">Progress photo</span><button class="pcam-ic" data-p="timer" aria-label="Timer">${IC.timer}<small>Off</small></button></div>
        <div class="pcam-count" hidden></div>
        <div class="pcam-bottom">
          <div class="pcam-chips">${ghost ? '<button class="pcam-chip on" data-p="ghost">Line up with last photo</button>' : ''}<span class="pcam-zoom" hidden></span></div>
          <div class="pcam-row pcam-live"><label class="pcam-ic big" aria-label="Upload a photo">${IC.up}<input type="file" accept="image/*" hidden data-p="file"></label><button data-p="shoot" class="pcam-shoot" aria-label="Take photo"><i></i></button><button class="pcam-ic big" data-p="flip" aria-label="Switch camera">${IC.flip}</button></div>
          <div class="pcam-row pcam-done" hidden><button class="pcam-txt" data-p="retake">Retake</button><button class="pcam-use" data-p="use">Use photo</button></div>
          <button class="pcam-cancel pcam-live" data-p="close">Cancel</button>
        </div>`;
      document.body.appendChild(box);
      document.documentElement.classList.add('pcam-open');
      const video = box.querySelector('video'), review = box.querySelector('.pcam-review'), zoomBox = box.querySelector('.pcam-zoom');
      const title = t => { box.querySelector('.pcam-title').textContent = t; };
      const stop = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; video.srcObject = null; };
      const onPop = () => finish(null, true);
      try { history.pushState({ pcam: 1 }, ''); window.addEventListener('popstate', onPop); } catch (_) {}
      const finish = (b, fromBack) => {
        if (done) return; done = true; stop(); clearInterval(countdown);
        window.removeEventListener('popstate', onPop);
        if (!fromBack) { try { if (history.state && history.state.pcam) history.back(); } catch (_) {} }
        document.documentElement.classList.remove('pcam-open');
        if (review.src) URL.revokeObjectURL(review.src);
        box.remove(); resolve(b);
      };
      async function open(face) {
        const base = { width: { ideal: 1280 }, height: { ideal: 960 } };
        const tries = [];
        const dev = cams.find(c => face === 'user' ? /front|user|facetime/i.test(c.label) : /back|rear|environment/i.test(c.label));
        tries.push({ ...base, facingMode: { exact: face } });
        if (dev) tries.push({ ...base, deviceId: { exact: dev.deviceId } });
        tries.push({ ...base, facingMode: face });
        tries.push(true);
        for (const v of tries) { try { return await navigator.mediaDevices.getUserMedia({ audio: false, video: v }); } catch (_) {} }
        throw new Error('no camera');
      }
      // Zoom: the camera's own zoom when the phone offers it (incl. 0.5x wide lens), otherwise a digital zoom (crop).
      const zLabel = z => (z < 1 ? '.' + String(Math.round(z * 10)) : String(Math.round(z * 10) / 10)) + '×';
      const curZoom = () => hw ? ((stream.getVideoTracks()[0].getSettings() || {}).zoom || 1) : dz;
      const paintZoom = () => { const c = curZoom(); zoomBox.querySelectorAll('button').forEach(b => b.classList.toggle('on', Math.abs(Number(b.dataset.z) - c) < .05)); const l = zoomBox.querySelector('.zl'); if (l) l.textContent = zLabel(c); };
      const applyDz = () => { video.style.transform = `scale(${dz})${facing === 'user' ? ' scaleX(-1)' : ''}`; };
      const setZoom = async z => {
        if (hw) { z = Math.max(hw.min, Math.min(hw.max, z)); try { await stream.getVideoTracks()[0].applyConstraints({ advanced: [{ zoom: z }] }); } catch (_) {} }
        else { dz = Math.max(1, Math.min(4, z)); applyDz(); }
        paintZoom();
      };
      const setupZoom = () => {
        hw = null; dz = 1; applyDz();
        const tr = stream && stream.getVideoTracks()[0];
        const cap = tr && tr.getCapabilities ? tr.getCapabilities() : {};
        if (cap.zoom && cap.zoom.max > cap.zoom.min) hw = { min: cap.zoom.min, max: Math.min(cap.zoom.max, 10) };
        const opts = hw ? [...new Set([hw.min, 1, 2, 5].filter(z => z >= hw.min && z <= hw.max))] : [1, 2, 3];
        zoomBox.innerHTML = opts.map(z => `<button data-p="zoom" data-z="${z}">${zLabel(z)}</button>`).join('');
        zoomBox.hidden = false; paintZoom();
      };
      // Pinch to zoom anywhere on the picture.
      let pinch = null;
      const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
      box.addEventListener('touchstart', e => { if (e.touches.length === 2 && stream) pinch = { d: dist(e.touches), z: curZoom() }; }, { passive: true });
      box.addEventListener('touchmove', e => { if (pinch && e.touches.length === 2) { e.preventDefault(); setZoom(pinch.z * dist(e.touches) / pinch.d); } }, { passive: false });
      box.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; });
      const start = async () => {
        if (busy) return; busy = true;
        stop();
        try {
          stream = await open(facing);
          video.srcObject = stream;
          const tr = stream.getVideoTracks()[0], st = tr.getSettings ? tr.getSettings() : {};
          if (st.facingMode) facing = st.facingMode === 'environment' ? 'environment' : 'user';
          video.classList.remove('mirror');
          await video.play().catch(() => {});
          if (!cams.length && navigator.mediaDevices.enumerateDevices) { try { cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput'); } catch (_) {} }
          box.querySelector('[data-p="flip"]').hidden = cams.length === 1;
          setupZoom(); title('Progress photo');
        } catch (_) { title('Camera unavailable: upload a photo'); }
        busy = false;
      };
      const showReview = blob => {
        shot = blob; review.src = URL.createObjectURL(blob); review.hidden = false; video.hidden = true;
        const g = box.querySelector('.pcam-ghost'); if (g) g.style.visibility = 'hidden';
        box.querySelectorAll('.pcam-live').forEach(e => e.hidden = true); box.querySelector('.pcam-done').hidden = false;
        box.querySelector('.pcam-chips').hidden = true; box.querySelector('[data-p="timer"]').hidden = true; title('Looking good?');
      };
      const backToLive = () => {
        if (review.src) URL.revokeObjectURL(review.src); review.removeAttribute('src'); review.hidden = true; video.hidden = false; shot = null;
        const g = box.querySelector('.pcam-ghost'); if (g) g.style.visibility = '';
        box.querySelectorAll('.pcam-live').forEach(e => e.hidden = false); box.querySelector('.pcam-done').hidden = true;
        box.querySelector('.pcam-chips').hidden = false; box.querySelector('[data-p="timer"]').hidden = false; title('Progress photo');
        box.querySelector('[data-p="flip"]').hidden = cams.length === 1;
      };
      const shoot = () => {
        if (!video.videoWidth) return;
        const vw = video.videoWidth, vh = video.videoHeight, z = hw ? 1 : dz, sw = vw / z, sh = vh / z;
        const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
        const x = c.getContext('2d'); if (facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
        x.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height); box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 180);
        c.toBlob(async b => showReview(await shrink(b)), 'image/jpeg', 0.9);
      };
      box.addEventListener('click', async e => {
        const b = e.target.closest('[data-p]'); if (!b || b.tagName === 'INPUT') return;
        const a = b.dataset.p;
        if (a === 'close') finish(null);
        if (a === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; b.classList.add('spin'); setTimeout(() => b.classList.remove('spin'), 400); await start(); }
        if (a === 'timer') { timer = timer === 0 ? 3 : timer === 3 ? 10 : 0; b.querySelector('small').textContent = timer ? timer + 's' : 'Off'; b.classList.toggle('on', !!timer); }
        if (a === 'ghost') { b.classList.toggle('on'); const g = box.querySelector('.pcam-ghost'); if (g) g.hidden = !b.classList.contains('on'); }
        if (a === 'zoom') await setZoom(Number(b.dataset.z));
        if (a === 'retake') backToLive();
        if (a === 'use' && shot) finish(shot);
        if (a === 'shoot') {
          if (countdown) return;
          if (!timer) return shoot();
          let n = timer; const cd = box.querySelector('.pcam-count'); cd.hidden = false; cd.textContent = n;
          countdown = setInterval(() => { n--; if (n <= 0) { clearInterval(countdown); countdown = null; cd.hidden = true; shoot(); } else cd.textContent = n; }, 1000);
        }
      });
      box.querySelectorAll('[data-p="close"]').forEach(b => b.addEventListener('pointerup', () => finish(null)));
      box.addEventListener('change', async e => {
        if (e.target.dataset.p === 'file' && e.target.files[0]) showReview(await shrink(e.target.files[0]));
      });
      start();
    });
  }

  // ---------------------------------------------------------------- transformation video
  // A built-in beat, made in code (so no music licences are needed).
  function beat(ac, dest, seconds, bpm = 120) {
    const t0 = ac.currentTime + 0.05, spb = 60 / bpm, master = ac.createGain(); master.gain.value = 0.55; master.connect(dest);
    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const bass = [55, 55, 65.4, 49];
    for (let i = 0, t = t0; t < t0 + seconds; i++, t += spb / 2) {
      if (i % 2 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3); }
      const n = ac.createBufferSource(), hg = ac.createGain(), hp = ac.createBiquadFilter(); n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7000; hg.gain.setValueAtTime(i % 4 === 2 ? 0.5 : 0.18, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.06); n.connect(hp).connect(hg).connect(master); n.start(t); n.stop(t + 0.08);
      if (i % 8 === 0) { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = bass[(i / 8) % 4]; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; g.gain.setValueAtTime(0.25, t); g.gain.linearRampToValueAtTime(0.001, t + spb * 3.8); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + spb * 4); }
    }
  }
  function pickMime() {
    const c = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return c.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  }
  const supported = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
  // opts: { photos:[{k, blob}], title, perPhoto (s), music: 'beat' | File | null, labels: k => text, endText, size: [w,h] }
  async function makeVideo(opts, onProgress = () => {}) {
    if (!supported()) throw new Error('This browser cannot make videos. Update your phone, or use the PC app.');
    const [W, H] = opts.size || [1080, 1350], per = opts.perPhoto || 0.35, fps = 30;
    const imgs = []; for (let i = 0; i < opts.photos.length; i++) { imgs.push(await loadImg(URL.createObjectURL(opts.photos[i].blob))); onProgress(i / opts.photos.length * 0.2); }
    const intro = 1.6, outro = 2.4, total = intro + imgs.length * per + outro;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const vstream = c.captureStream(fps);
    const ac = new (window.AudioContext || window.webkitAudioContext)(); const dest = ac.createMediaStreamDestination();
    if (opts.music === 'beat') beat(ac, dest, total + 0.5);
    else if (opts.music && opts.music.arrayBuffer) {
      const buf = await ac.decodeAudioData(await opts.music.arrayBuffer());
      const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g).connect(dest);
      const t0 = ac.currentTime; g.gain.setValueAtTime(1, t0); g.gain.setValueAtTime(1, t0 + total - 1.2); g.gain.linearRampToValueAtTime(0, t0 + total);
      src.start(t0, Math.min(opts.musicStart || 0, Math.max(0, buf.duration - total)));
    }
    const tracks = [...vstream.getVideoTracks(), ...(opts.music ? dest.stream.getAudioTracks() : [])];
    const mime = pickMime(); const rec = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : undefined);
    const chunks = []; rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });
    const cover = (img, a) => { const s = Math.max(W / img.width, H / img.height); const w = img.width * s, h = img.height * s; x.globalAlpha = a; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); x.globalAlpha = 1; };
    const text = (t, y, size, color = '#fff', weight = 800) => { x.font = `${weight} ${size}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.fillStyle = color; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 18; x.fillText(t, W / 2, y); x.shadowBlur = 0; };
    const frame = t => {
      x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, W, H);
      if (t < intro) {
        const a = Math.min(1, t / 0.4);
        x.globalAlpha = a; text('GG GAINS', H * 0.40, 64, '#E0263A', 900); text(opts.title || 'My transformation', H * 0.5, 72); text(opts.subtitle || '', H * 0.57, 40, '#bbb', 600); x.globalAlpha = 1;
        return;
      }
      const tt = t - intro, i = Math.min(imgs.length - 1, Math.floor(tt / per)), f = (tt - i * per) / per;
      if (i < imgs.length && tt < imgs.length * per) {
        cover(imgs[i], 1);
        if (i + 1 < imgs.length && f > 0.7) cover(imgs[i + 1], (f - 0.7) / 0.3);
        const lab = opts.labels ? opts.labels(opts.photos[i].k) : opts.photos[i].k;
        x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, H - 150, W, 150); text(lab, H - 60, 46, '#fff', 700);
        x.fillStyle = '#E0263A'; x.fillRect(0, H - 8, W * (i + 1) / imgs.length, 8);
        return;
      }
      // outro: first and last side by side
      const a = imgs[0], b = imgs[imgs.length - 1], half = W / 2;
      const draw = (img, ox) => { const s = Math.max(half / img.width, H / img.height); const w = img.width * s, h = img.height * s; x.save(); x.beginPath(); x.rect(ox, 0, half, H); x.clip(); x.drawImage(img, ox + (half - w) / 2, (H - h) / 2, w, h); x.restore(); };
      draw(a, 0); draw(b, half); x.fillStyle = '#E0263A'; x.fillRect(half - 3, 0, 6, H);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, H - 230, W, 230);
      text(opts.endText || 'GG', H - 130, 60); text('Made with GG Gains', H - 60, 34, '#E0263A', 800);
    };
    rec.start(250);
    const t0 = performance.now();
    await new Promise(resolve => {
      const tick = () => { const t = (performance.now() - t0) / 1000; frame(Math.min(t, total)); onProgress(0.2 + 0.8 * Math.min(1, t / total)); if (t >= total) return resolve(); requestAnimationFrame(tick); };
      tick();
    });
    rec.stop(); await done; ac.close().catch(() => {});
    const type = (mime || 'video/webm').split(';')[0];
    return { blob: new Blob(chunks, { type }), ext: type.includes('mp4') ? 'mp4' : 'webm' };
  }

  window.MHPhotos = { get, put, del, keys, list, capture, shrink, makeVideo, supported, async days() { return new Set(await keys()); } };
})();
