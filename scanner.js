// Barcode scanner. Live camera first; "take a photo" (sharper on iPhone) and
// typing the number as fallbacks. Resolves with the barcode digits, or null.
(function () {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const validEan = code => {
    if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
    const d = code.split('').map(Number), check = d.pop();
    const sum = d.reverse().reduce((a, n, i) => a + n * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === check;
  };

  function formats() {
    const F = window.Html5QrcodeSupportedFormats;
    return F ? [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128] : undefined;
  }

  window.MHScanner = {
    scan() {
      return new Promise(resolve => {
        let done = false, live = null, lastSeen = null, seenCount = 0;
        const box = document.createElement('div');
        box.className = 'scanner';
        box.innerHTML = `
          <div class="scan-top"><button data-sc="close">Cancel</button><span>Scan a barcode</span><span style="width:64px"></span></div>
          <div id="mhReader" class="scan-video"></div>
          <div class="scan-guide" aria-hidden="true"><i></i></div>
          <div class="scan-bottom">
            <p class="scan-msg" id="scMsg">Hold the barcode inside the box, about 15 cm away.</p>
            <div class="scan-actions">
              <label class="btn">Take a photo instead<input type="file" accept="image/*" capture="environment" id="scFile" hidden></label>
              <button class="btn" data-sc="type">Type the number</button>
            </div>
            <div class="scan-type" id="scType" hidden><input type="text" inputmode="numeric" id="scNum" placeholder="e.g. 5000159484695" maxlength="14"><button class="btn primary" data-sc="go">Find</button></div>
          </div>`;
        document.body.appendChild(box);
        const msg = t => { const m = box.querySelector('#scMsg'); if (m) m.textContent = t; };
        const finish = async (code) => {
          if (done) return; done = true;
          try { if (live) { await live.stop(); live.clear(); } } catch (_) {}
          box.remove();
          resolve(code);
        };
        box.addEventListener('click', e => {
          const b = e.target.closest('[data-sc]'); if (!b) return;
          if (b.dataset.sc === 'close') finish(null);
          if (b.dataset.sc === 'type') { box.querySelector('#scType').hidden = false; box.querySelector('#scNum').focus(); }
          if (b.dataset.sc === 'go') {
            const v = box.querySelector('#scNum').value.replace(/\D/g, '');
            if (v.length < 8) msg('Barcodes are 8 to 14 digits long.'); else finish(v);
          }
        });
        box.querySelector('#scNum').addEventListener('keydown', e => { if (e.key === 'Enter') box.querySelector('[data-sc="go"]').click(); });

        // Photo of the barcode: the phone's camera app focuses better than live video.
        box.querySelector('#scFile').addEventListener('change', async ev => {
          const file = ev.target.files && ev.target.files[0]; if (!file) return;
          msg('Reading the photo…');
          try {
            if (live) { try { await live.stop(); } catch (_) {} }
            const reader = new window.Html5Qrcode('mhReader', { formatsToSupport: formats(), verbose: false });
            const code = await reader.scanFile(file, false);
            finish(String(code).replace(/\D/g, ''));
          } catch (e) { msg('No barcode found in that photo. Try again closer, with the barcode flat and well lit.'); }
        });

        if (!window.Html5Qrcode) { msg('The scanner is still loading. Try "Take a photo" or type the number.'); return; }
        try {
          live = new window.Html5Qrcode('mhReader', { formatsToSupport: formats(), verbose: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
        } catch (e) { msg('Camera scanning is not available here. Take a photo or type the number.'); return; }
        live.start({ facingMode: 'environment' }, {
          fps: 15, disableFlip: true,
          videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] }
        }, (text) => {
          const code = String(text).replace(/\D/g, '');
          // Accept a valid EAN/UPC at once; otherwise wait for the same read twice.
          if (validEan(code)) { if (navigator.vibrate) navigator.vibrate(60); return finish(code); }
          if (code === lastSeen) { if (++seenCount >= 2) finish(code); } else { lastSeen = code; seenCount = 1; }
        }, () => {}).catch(err => {
          const t = String(err || '');
          msg(/NotAllowed|Permission/i.test(t) ? 'Camera access is off. Allow the camera for this app in your phone settings, or take a photo instead.' : 'Could not start the camera. Take a photo instead, or type the number.');
        });
      });
    }
  };
})();
