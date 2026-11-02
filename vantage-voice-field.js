/* Virorah Vantage: mic buttons on text boxes. Needs vantage-voice.js loaded first.
 * Markup: <button class="voice-btn" onclick="toggleVoiceInput('textareaId', this)">.
 * Tap to start, tap again to stop. The transcript is added to the end of the box.
 * Progress and problems are shown in a small line under the box, never in an alert. */
(function () {
  if (!window.VantageVoice) return;
  var cur = null; // { id, btn, ctrl, note }

  function setBtn(btn, st) {
    if (!btn) return;
    if (st === 'recording') { btn.innerHTML = '&#9209;'; btn.classList.add('listening'); btn.title = 'Tap to stop'; }
    else if (st === 'processing') { btn.innerHTML = '&#8987;'; btn.classList.remove('listening'); btn.title = 'Transcribing...'; }
    else { btn.innerHTML = '&#127908;'; btn.classList.remove('listening'); btn.title = 'Tap to speak'; }
  }

  function noteFor(btn) {
    var host = btn.parentNode, n = host.nextElementSibling;
    if (n && n.className === 'vv-note') return n;
    n = document.createElement('div'); n.className = 'vv-note';
    n.setAttribute('role', 'status');
    n.style.cssText = "font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.5;color:#a5b4fc;margin:6px 2px 0;min-height:0";
    host.parentNode.insertBefore(n, host.nextSibling);
    return n;
  }
  function say(note, text, bad) {
    clearTimeout(note._t);
    note.textContent = text; note.style.color = bad === true ? '#fca5a5' : '#a5b4fc';
    if (text && bad !== 'live') note._t = setTimeout(function () { note.textContent = ''; }, 8000);
  }

  function build(id, btn) {
    var note = noteFor(btn);
    var s = { id: id, btn: btn, note: note };
    s.ctrl = VantageVoice.create({
      maxMs: 90000, silenceMs: 8000,
      onState: function (st) {
        setBtn(btn, st === 'starting' ? 'processing' : st);
        if (st === 'recording') say(note, '0:00 · tap the mic to stop', 'live');
        if (st === 'processing') say(note, 'Transcribing your voice...', 'live');
        if (st === 'idle' && cur === s) cur = null;
      },
      onTick: function (t) {
        say(note, VantageVoice.mmss(t.elapsedMs) + (t.remainingMs <= 15000 ? ' · stops at 1:30' : ' · tap the mic to stop'), 'live');
      },
      onText: function (text) {
        var el = document.getElementById(id); if (!el) return;
        var have = el.value.trim();
        el.value = have ? have + ' ' + text : text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        say(note, 'Check the words, edit if needed.', false);
      },
      onError: function (code, msg) { setBtn(btn, 'idle'); say(note, msg, true); }
    });
    return s;
  }

  window.toggleVoiceInput = function (targetId, btn) {
    if (!VantageVoice.supported()) { say(noteFor(btn), 'Voice input is not supported in this browser. Please type instead.', true); return; }
    if (cur && cur.id === targetId && cur.ctrl.state === 'recording') { cur.ctrl.stop(); return; }
    if (cur && cur.ctrl.state === 'recording') { cur.ctrl.stop(); return; } // a different box is recording: finish it first
    if (cur && cur.ctrl.state !== 'idle') return;
    cur = build(targetId, btn);
    cur.ctrl.start();
  };
})();
