/* Cozumel voice — Web Speech API only (no network, no keys). Works in browser and in node (for tests). */
(function (root) {
'use strict';
var KEY = 'cozumel.voice';
var PREF = ['paulina', 'juan', 'mónica', 'monica', 'angelica', 'angélica', 'google español de estados unidos', 'google español', 'diego', 'carlos', 'jorge', 'marisol'];
var NOVELTY = /(eddy|flo\b|grandma|grandpa|reed|rocko|sandy|shelley|bad news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|albert|fred|junior|kathy|ralph|good news|hysterical|princess|deranged)/i;
function norm(s) { return String(s || '').toLowerCase(); }
function langOf(v) { return String(v && v.lang || '').replace('_', '-'); }
function score(v, wanted) {
  var l = langOf(v), n = norm(v.name), s = 0;
  if (/^es-mx$/i.test(l)) s += 1000; else if (/^es-us$/i.test(l)) s += 700; else if (/^es/i.test(l)) s += 300; else return -1;
  if (/enhanced|premium|mejorad|neural|natural|siri/.test(n + ' ' + norm(v.voiceURI))) s += 200;
  for (var i = 0; i < PREF.length; i++) if (n.indexOf(PREF[i]) !== -1) { s += 100 - i; break; }
  if (NOVELTY.test(n)) s -= 600;
  if (v.localService === false && !/google/.test(n)) s -= 20;
  if (wanted && v.voiceURI === wanted) s += 5000;
  return s;
}
function esVoices(voices) { return (voices || []).filter(function (v) { return score(v) >= 0; }); }
function pickVoice(voices, wantedURI) {
  var best = null, bs = -1;
  (voices || []).forEach(function (v) { var s = score(v, wantedURI); if (s > bs) { bs = s; best = v; } });
  return best;
}
function sorted(voices) { return esVoices(voices).sort(function (a, b) { return score(b) - score(a); }); }
/* spoken text: drop emoji, parenthetical (Hebrew or other) notes, brackets, Hebrew letters, symbols */
function clean(t) {
  return String(t == null ? '' : t)
    .replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, ' ')
    .replace(/[\u0590-\u05FF]+/g, ' ')
    .replace(/[\u{1F000}-\u{1FFFF}\u2190-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u200E\u200F]/gu, ' ')
    .replace(/[_*#~^|<>{}=+\\\/→←]+/g, ' ')
    .replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();
}
function load() { try { var o = JSON.parse(root.localStorage.getItem(KEY)); if (o && typeof o === 'object') return { uri: o.uri || '', slow: !!o.slow }; } catch (e) {} return { uri: '', slow: false }; }
function save(o) { try { root.localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
var st = load(), cache = [], keep = null;
function synth() { return root.speechSynthesis || null; }
function refresh() { var s = synth(); if (!s) return cache; try { var v = s.getVoices(); if (v && v.length) cache = v; } catch (e) {} return cache; }
/* wait for the voice list (iOS/Chrome fill it late); resolves with whatever exists after timeout */
function ready(timeoutMs, synthObj) {
  var s = synthObj || synth();
  return new Promise(function (res) {
    if (!s) return res([]);
    var done = false, t;
    function fin() { if (done) return; done = true; clearTimeout(t); try { s.removeEventListener('voiceschanged', on); } catch (e) {} try { var v = s.getVoices(); if (v && v.length) cache = v; } catch (e) {} res(cache); }
    function on() { var v = s.getVoices(); if (v && v.length) fin(); }
    try { if (s.getVoices().length) return fin(); } catch (e) {}
    try { s.addEventListener('voiceschanged', on); } catch (e) {}
    t = setTimeout(fin, timeoutMs == null ? 2500 : timeoutMs);
  });
}
function rate() { return st.slow ? 0.6 : 0.8; }
/* speak(['word', 'example sentence']) — queued synchronously inside the tap (iOS needs the gesture). */
function speak(parts) {
  var s = synth(); if (!s) return false;
  if (typeof parts === 'string') parts = [parts];
  var list = parts.map(clean).filter(Boolean); if (!list.length) return false;
  try {
    s.cancel();
    if (keep) { clearInterval(keep); keep = null; }
    var v = pickVoice(refresh(), st.uri);
    list.forEach(function (txt, i) {
      var u = new root.SpeechSynthesisUtterance(txt);
      u.lang = (v && langOf(v)) || 'es-MX'; if (!/^es/i.test(u.lang)) u.lang = 'es-MX';
      if (v) u.voice = v;
      u.rate = rate(); u.pitch = 1; u.volume = 1;
      if (i === list.length - 1) u.onend = u.onerror = function () { if (keep) { clearInterval(keep); keep = null; } };
      s.speak(u);
    });
    // Chrome stops long utterances after ~15s: nudge with pause/resume while speaking
    keep = setInterval(function () { if (!s.speaking) { clearInterval(keep); keep = null; return; } s.pause(); s.resume(); }, 10000);
    return true;
  } catch (e) { return false; }
}
var API = {
  score: score, pickVoice: pickVoice, sorted: sorted, esVoices: esVoices, clean: clean, ready: ready, speak: speak, refresh: refresh,
  get: function () { return { uri: st.uri, slow: st.slow }; },
  set: function (o) { if (o.uri != null) st.uri = o.uri; if (o.slow != null) st.slow = !!o.slow; save(st); },
  voices: function () { return sorted(refresh()); },
  current: function () { return pickVoice(refresh(), st.uri); }
};
root.CozumelVoice = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (synth()) { ready(3000); try { synth().addEventListener('voiceschanged', refresh); } catch (e) {} }
})(typeof window !== 'undefined' ? window : globalThis);
