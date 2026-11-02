/* Virorah Vantage: voice input. Records on the device, sends the clip to the Worker's /transcribe
 * route (Whisper), and hands the text back. No browser speech engine is used.
 *
 *   var v = VantageVoice.create({
 *     maxMs: 90000,        // hard cap per clip (default 90 s)
 *     silenceMs: 0,        // auto-stop after this much silence once the person has spoken (0 = tap to stop only)
 *     onState(s)           // 'idle' | 'starting' | 'recording' | 'processing'
 *     onTick({elapsedMs, remainingMs, level, silentMs})
 *     onText(text)         // transcript
 *     onError(code, msg)   // code: blocked | no_mic | mic_error | no_speech | auth | limit | network | timeout | failed
 *   });
 *   v.start(); v.stop(); v.cancel(); v.state
 *
 * Audio is downmixed to mono and resampled to 16 kHz 16-bit WAV (about 1.9 MB per minute) before upload.
 * A clip with no detected speech is never sent (it would cost a daily transcription and Whisper tends to
 * invent text from silence). Server contract: POST multipart 'audio' (a .wav), Authorization: Bearer <Clerk JWT>.
 */
(function () {
  var TARGET_RATE = 16000;
  var DEFAULT_WORKER = 'https://situation-room-api.kumarvivek-srv.workers.dev';

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
  }

  /* box-filter downsample: averages every input sample that falls in each output slot */
  function resample(f32, inRate, outRate) {
    if (inRate === outRate) return f32;
    var ratio = inRate / outRate, n = Math.floor(f32.length / ratio), out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * ratio), b = Math.min(f32.length, Math.max(a + 1, Math.floor((i + 1) * ratio))), sum = 0;
      for (var j = a; j < b; j++) sum += f32[j];
      out[i] = sum / (b - a);
    }
    return out;
  }

  function encodeWAV(f32, rate) {
    var pcm = new Int16Array(f32.length);
    for (var i = 0; i < f32.length; i++) { var s = Math.max(-1, Math.min(1, f32[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
    var buf = new ArrayBuffer(44 + pcm.byteLength), v = new DataView(buf);
    function ws(o, str) { for (var k = 0; k < str.length; k++) v.setUint8(o + k, str.charCodeAt(k)); }
    ws(0, 'RIFF'); v.setUint32(4, 36 + pcm.byteLength, true); ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ws(36, 'data'); v.setUint32(40, pcm.byteLength, true);
    new Int16Array(buf, 44).set(pcm);
    return new Blob([buf], { type: 'audio/wav' });
  }

  function rms(buf) {
    var sum = 0; for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / (buf.length || 1));
  }

  /* Decides speech vs silence per chunk. The noise floor is the quietest chunk seen so far, so it can only
     under-estimate the background, never mistake a person who starts talking immediately for silence. */
  function Detector() { this.floor = Infinity; this.speechFrames = 0; this.lastSpeech = 0; this.last = 0; }
  Detector.prototype.update = function (level, now) {
    this.last = level;
    if (level < this.floor) this.floor = level;
    var threshold = Math.max(0.012, this.floor * 3);
    if (level > threshold) { this.speechFrames++; if (this.speechFrames >= 3) this.lastSpeech = now; }
    return level > threshold;
  };
  Detector.prototype.hasSpoken = function () { return this.speechFrames >= 3; };

  function getToken() {
    try { if (window.Clerk && window.Clerk.session) return window.Clerk.session.getToken().catch(function () { return ''; }); } catch (e) {}
    return Promise.resolve('');
  }

  function create(opts) {
    opts = opts || {};
    var maxMs = opts.maxMs || 90000, silenceMs = opts.silenceMs || 0, worker = opts.worker || DEFAULT_WORKER;
    var me = { state: 'idle' };
    var stream = null, ctx = null, src = null, proc = null, buffers = [], rate = 44100, t0 = 0, det = null, timer = 0;

    function setState(s) { me.state = s; if (opts.onState) try { opts.onState(s); } catch (e) {} }
    function fail(code, msg) { if (opts.onError) try { opts.onError(code, msg); } catch (e) {} }

    function cleanup() {
      clearInterval(timer); timer = 0;
      try { if (proc) { proc.onaudioprocess = null; proc.disconnect(); } } catch (e) {}
      try { if (src) src.disconnect(); } catch (e) {}
      try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      try { if (ctx && ctx.state !== 'closed') ctx.close(); } catch (e) {}
      proc = src = stream = ctx = null;
    }

    function tick() {
      if (me.state !== 'recording') return;
      var now = Date.now(), elapsed = now - t0;
      if (opts.onTick) try { opts.onTick({ elapsedMs: elapsed, remainingMs: Math.max(0, maxMs - elapsed), level: det.last, silentMs: det.hasSpoken() ? now - det.lastSpeech : 0 }); } catch (e) {}
      if (elapsed >= maxMs) finish('max');
      else if (silenceMs && det.hasSpoken() && now - det.lastSpeech >= silenceMs) finish('silence');
    }

    function send(blob, attempt) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
      return getToken().then(function (tok) {
        var fd = new FormData(); fd.append('audio', blob, 'recording.wav');
        var headers = {}; if (tok) headers['Authorization'] = 'Bearer ' + tok;
        return fetch(worker + '/transcribe', { method: 'POST', headers: headers, body: fd, signal: ctrl ? ctrl.signal : undefined });
      }).then(function (r) {
        clearTimeout(to);
        return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, data: d || {} }; });
      }).then(function (res) {
        var d = res.data;
        if (res.status === 401) { fail('auth', 'Please sign in again to use voice.'); return; }
        if (res.status === 429 || d.error === 'USAGE_LIMIT') { fail('limit', d.message || 'You have reached today’s voice limit. Please type instead.'); return; }
        if (res.status >= 500 && attempt < 1) { return new Promise(function (ok) { setTimeout(ok, 1200); }).then(function () { return send(blob, attempt + 1); }); }
        if (!d.success) { fail('failed', 'Transcription failed. Try again, or type instead.'); return; }
        var text = String(d.text || '').trim();
        if (!text) { fail('no_speech', 'Didn’t catch anything. Tap the mic and try again.'); return; }
        if (opts.onText) try { opts.onText(text); } catch (e) {}
      }).catch(function (e) {
        clearTimeout(to);
        if (attempt < 1 && !(e && e.name === 'AbortError')) { return new Promise(function (ok) { setTimeout(ok, 1200); }).then(function () { return send(blob, attempt + 1); }); }
        if (e && e.name === 'AbortError') fail('timeout', 'That took too long. Try a shorter recording, or type instead.');
        else fail('network', 'Could not reach the server. Check your connection and try again.');
      });
    }

    function finish(reason) {
      if (me.state !== 'recording') return;
      setState('processing');
      var chunks = buffers; buffers = []; var spoke = det.hasSpoken(), inRate = rate;
      cleanup();
      var total = 0; chunks.forEach(function (c) { total += c.length; });
      if (!spoke || total / inRate < 0.5) { setState('idle'); fail('no_speech', 'Didn’t catch anything. Tap the mic and try again.'); return; }
      var merged = new Float32Array(total), off = 0; chunks.forEach(function (c) { merged.set(c, off); off += c.length; });
      var blob = encodeWAV(resample(merged, inRate, TARGET_RATE), TARGET_RATE);
      me.lastClipBytes = blob.size;
      send(blob, 0).then(function () { setState('idle'); });
    }

    me.start = function () {
      if (me.state !== 'idle') return Promise.resolve(false);
      if (!supported()) { fail('mic_error', 'Voice input is not supported in this browser. Please type instead.'); return Promise.resolve(false); }
      setState('starting');
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }).then(function (s) {
        stream = s; buffers = []; det = new Detector();
        var AC = window.AudioContext || window.webkitAudioContext; ctx = new AC();
        if (ctx.state === 'suspended') ctx.resume();
        rate = ctx.sampleRate; src = ctx.createMediaStreamSource(s);
        proc = ctx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = function (e) {
          if (me.state !== 'recording') return;
          var d = new Float32Array(e.inputBuffer.getChannelData(0));
          buffers.push(d); det.update(rms(d), Date.now());
        };
        src.connect(proc); proc.connect(ctx.destination);
        t0 = Date.now(); setState('recording'); timer = setInterval(tick, 100);
        return true;
      }).catch(function (e) {
        cleanup(); setState('idle');
        var n = e && e.name;
        if (n === 'NotAllowedError' || n === 'SecurityError') fail('blocked', 'Microphone is blocked. Allow mic access for this site in your browser settings, or type instead.');
        else if (n === 'NotFoundError' || n === 'OverconstrainedError') fail('no_mic', 'No microphone found. Please type instead.');
        else fail('mic_error', 'Could not start the microphone. Try again, or type instead.');
        return false;
      });
    };
    me.stop = function () { finish('stop'); };
    me.cancel = function () { if (me.state === 'recording') { buffers = []; cleanup(); setState('idle'); } };

    document.addEventListener('visibilitychange', function () { if (document.hidden && me.state === 'recording') finish('hidden'); });
    return me;
  }

  function mmss(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  window.VantageVoice = { create: create, supported: supported, mmss: mmss, _t: { resample: resample, encodeWAV: encodeWAV, rms: rms, Detector: Detector } };
})();
