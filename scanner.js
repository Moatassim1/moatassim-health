// Barcode scanner. Runs its own camera loop: it reads only the area inside the
// on-screen box, a few times a second, which works far better on iPhone than
// scanning whole 1080p frames. "Take a photo" and typing the number are fallbacks.
// MHScanner.scan() resolves with the barcode digits, or null.
(function () {
  'use strict';
  const validEan = code => {
    if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
    const d = code.split('').map(Number), check = d.pop();
    const sum = d.reverse().reduce((a, n, i) => a + n * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === check;
  };

  let decoder = null;
  function getDecoder() {
    if (decoder) return decoder;
    if (!window.Html5Qrcode) return null;
    let holder = document.getElementById('mhDecoder');
    if (!holder) { holder = document.createElement('div'); holder.id = 'mhDecoder'; holder.hidden = true; document.body.appendChild(holder); }
    const F = window.Html5QrcodeSupportedFormats;
    const lib = new window.Html5Qrcode('mhDecoder', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128], useBarCodeDetectorIfSupported: true, verbose: false });
    decoder = lib.qrcode; // the library's decoder (phone's built-in reader when there is one, otherwise ZXing)
    return decoder;
  }
  async function decodeCanvas(c) {
    const d = getDecoder(); if (!d) return null;
    try { const r = await d.decodeAsync(c); return r && r.text ? String(r.text).replace(/\D/g, '') : null; } catch (_) { return null; }
  }
  function canvasFrom(src, sx, sy, sw, sh, maxW, rotate) {
    const scale = Math.min(1, maxW / sw);
    const w = Math.max(1, Math.round(sw * scale)), h = Math.max(1, Math.round(sh * scale));
    const c = document.createElement('canvas');
    if (rotate) { c.width = h; c.height = w; } else { c.width = w; c.height = h; }
    const x = c.getContext('2d', { willReadFrequently: true });
    if (rotate) { x.translate(h, 0); x.rotate(Math.PI / 2); }
    x.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    return c;
  }

  // A still photo: try the whole picture, the middle band, then turned sideways.
  async function decodePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const W = img.naturalWidth, H = img.naturalHeight;
      const tries = [
        [0, 0, W, H, 1400, false],
        [W * 0.05, H * 0.3, W * 0.9, H * 0.4, 1400, false],
        [W * 0.15, H * 0.38, W * 0.7, H * 0.24, 1200, false],
        [0, 0, W, H, 1400, true],
        [W * 0.3, H * 0.05, W * 0.4, H * 0.9, 1400, true]
      ];
      for (const t of tries) { const code = await decodeCanvas(canvasFrom(img, ...t)); if (code && code.length >= 8) return code; }
      return null;
    } finally { URL.revokeObjectURL(url); }
  }

  window.MHScanner = {
    decodePhoto,
    scan() {
      return new Promise(resolve => {
        let done = false, stream = null, timer = null, busy = false, lastSeen = null, seenCount = 0, flip = 0;
        const box = document.createElement('div');
        box.className = 'scanner';
        box.innerHTML = `
          <video class="scan-cam" playsinline muted autoplay></video>
          <div class="scan-guide" aria-hidden="true"><i id="scBox"><b></b></i></div>
          <div class="scan-top"><button data-sc="close">Cancel</button><span>Scan a barcode</span><button data-sc="torch" id="scTorch" hidden>Light</button></div>
          <div class="scan-bottom">
            <p class="scan-msg" id="scMsg">Starting the camera…</p>
            <div class="scan-actions">
              <label class="btn">Take a photo instead<input type="file" accept="image/*" capture="environment" id="scFile" hidden></label>
              <button class="btn" data-sc="type">Type the number</button>
            </div>
            <div class="scan-type" id="scType" hidden><input type="text" inputmode="numeric" id="scNum" placeholder="e.g. 5000159484695" maxlength="14"><button class="btn primary" data-sc="go">Find</button></div>
          </div>`;
        document.body.appendChild(box);
        const video = box.querySelector('video');
        const msg = t => { const m = box.querySelector('#scMsg'); if (m) m.textContent = t; };
        const stop = () => { clearTimeout(timer); timer = null; if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
        const finish = code => { if (done) return; done = true; stop(); box.remove(); resolve(code); };
        const found = code => { if (navigator.vibrate) navigator.vibrate(60); box.classList.add('hit'); setTimeout(() => finish(code), 180); };

        box.addEventListener('click', e => {
          const b = e.target.closest('[data-sc]'); if (!b) return;
          const a = b.dataset.sc;
          if (a === 'close') finish(null);
          if (a === 'type') { box.querySelector('#scType').hidden = false; box.querySelector('#scNum').focus(); }
          if (a === 'go') { const v = box.querySelector('#scNum').value.replace(/\D/g, ''); if (v.length < 8) msg('Barcodes are 8 to 14 digits long.'); else finish(v); }
          if (a === 'torch' && stream) {
            const tr = stream.getVideoTracks()[0]; b.classList.toggle('on');
            tr.applyConstraints({ advanced: [{ torch: b.classList.contains('on') }] }).catch(() => {});
          }
        });
        box.querySelector('#scNum').addEventListener('keydown', e => { if (e.key === 'Enter') box.querySelector('[data-sc="go"]').click(); });
        box.querySelector('#scFile').addEventListener('change', async ev => {
          const file = ev.target.files && ev.target.files[0]; if (!file) return;
          msg('Reading the photo…');
          const code = await decodePhoto(file).catch(() => null);
          if (code) finish(code); else msg('No barcode found in that photo. Get closer so the barcode fills most of the picture, keep it flat and well lit.');
          ev.target.value = '';
        });

        // Read the part of the picture inside the box (a bit wider, to be forgiving).
        function cropRect() {
          const vw = video.videoWidth, vh = video.videoHeight;
          const vr = video.getBoundingClientRect(), g = box.querySelector('#scBox').getBoundingClientRect();
          const s = Math.max(vr.width / vw, vr.height / vh); // object-fit: cover
          const ox = (vr.width - vw * s) / 2, oy = (vr.height - vh * s) / 2;
          let x = (g.left - vr.left - ox) / s, y = (g.top - vr.top - oy) / s, w = g.width / s, h = g.height / s;
          const padX = w * 0.12, padY = h * 0.35;
          x -= padX; y -= padY; w += padX * 2; h += padY * 2;
          x = Math.max(0, x); y = Math.max(0, y); w = Math.min(vw - x, w); h = Math.min(vh - y, h);
          return [x, y, w, h];
        }
        async function tick() {
          if (done) return;
          if (!busy && video.readyState >= 2 && video.videoWidth) {
            busy = true;
            try {
              flip = (flip + 1) % 3;
              const [x, y, w, h] = cropRect();
              // Mostly the box at good resolution; every third go, a wider view.
              const c = flip === 2 ? canvasFrom(video, 0, video.videoHeight * 0.15, video.videoWidth, video.videoHeight * 0.7, 960, false) : canvasFrom(video, x, y, w, h, flip ? 1000 : 720, false);
              const code = await decodeCanvas(c);
              if (code && code.length >= 8) {
                if (validEan(code)) return found(code);
                if (code === lastSeen) { if (++seenCount >= 2) return found(code); } else { lastSeen = code; seenCount = 1; }
              }
            } catch (_) {}
            busy = false;
          }
          timer = setTimeout(tick, 90);
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg('Camera scanning is not available here. Take a photo or type the number.'); return; }
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } })
          .then(async s => {
            if (done) { s.getTracks().forEach(t => t.stop()); return; }
            stream = s; video.srcObject = s;
            try { await video.play(); } catch (_) {}
            const tr = s.getVideoTracks()[0];
            try {
              const caps = tr.getCapabilities ? tr.getCapabilities() : {};
              const adv = {};
              if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
              if (caps.zoom && caps.zoom.max >= 1.5) adv.zoom = Math.min(caps.zoom.max, 1.6); // a little zoom helps small barcodes
              if (Object.keys(adv).length) tr.applyConstraints({ advanced: [adv] }).catch(() => {});
              if (caps.torch) box.querySelector('#scTorch').hidden = false;
            } catch (_) {}
            if (!getDecoder()) { msg('The scanner is still loading. Try again in a moment, or type the number.'); return; }
            msg('Hold the barcode inside the box, about 10–15 cm away, until it buzzes.');
            tick();
          })
          .catch(err => {
            const t = String((err && err.name) || err || '');
            msg(/NotAllowed|Permission|Security/i.test(t) ? 'Camera access is off. Allow the camera for this app in your phone settings (Settings › Safari › Camera), or take a photo instead.' : 'Could not start the camera. Take a photo instead, or type the number.');
          });
      });
    }
  };
})();
